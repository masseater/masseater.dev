import { layer } from "@effect/vitest";
import { Array as Arr, Effect, String as Str, pipe } from "effect";
import { expect } from "vite-plus/test";

import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkWorkflowPaths } from "./workflow-paths.ts";

const WORKFLOW = `on:
  push:
    paths:
      - "apps/web/**"
      - "apps/gone/**"
      - "!docs/**"
    paths-ignore:
      - "*.md"
defaults:
  run:
    working-directory: apps/web
jobs:
  reuse:
    uses: ./.github/workflows/missing.yml
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: ./.github/actions/setup
      - uses: ./.github/actions/absent
      - uses: actions/setup-node@v6
        with:
          cache-dependency-path: |
            pnpm-lock.yaml
            apps/gone/pnpm-lock.yaml
      - run: node scripts/build.ts && bash scripts/absent.sh
      - run: node scripts/build.ts
        working-directory: \${{ matrix.dir }}
      - run: echo ok
        working-directory: apps/missing
      - uses: actions/cache@v5
        with:
          key: \${{ hashFiles('pnpm-lock.yaml', 'apps/gone/*.lock') }}
      - uses: actions/cache/restore@v5
        with:
          path: tools/.cache/pool.tar
      - run: tar -xf pool.tar
        working-directory: tools/.cache
`;

const problemsFor = Effect.fn("problemsFor")(function* problemsFor(workflow: string) {
  const root = yield* gitRepositoryWith({
    ".github/actions/setup/action.yml": "runs:\n  using: composite\n  steps: []\n",
    ".github/workflows/ci.yml": workflow,
    ".gitignore": "out/\n",
    "README.md": "# readme\n",
    "apps/web/package.json": "{}",
    "apps/web/scripts/build.ts": "",
    "pnpm-lock.yaml": "",
  });
  const problems = yield* checkWorkflowPaths(root);
  return pipe(
    problems,
    Arr.map(({ line, message }) => `${line} ${Arr.headNonEmpty(Str.split(message, ","))}`),
  );
});

const reportsMissingPaths = Effect.gen(function* reportsMissingPaths() {
  const found = yield* problemsFor(WORKFLOW);
  expect(found).toStrictEqual([
    "5 on.push.paths names apps/gone/**",
    "14 jobs.reuse.uses names .github/workflows/missing.yml",
    "19 jobs.build.steps[1].uses names .github/actions/absent",
    "22 jobs.build.steps[2].with.cache-dependency-path names apps/gone/pnpm-lock.yaml",
    "25 jobs.build.steps[3].run names apps/web/scripts/absent.sh",
    "29 jobs.build.steps[5].working-directory names apps/missing",
    "32 hashFiles names apps/gone/*.lock",
  ]);
});

const acceptsExistingPaths = Effect.gen(function* acceptsExistingPaths() {
  const found = yield* problemsFor(`on:
  pull_request:
    paths: ["apps/**"]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: ./.github/actions/setup
      - run: node apps/web/scripts/build.ts
      - run: cd apps/web && node scripts/build.ts
      - run: node out/generated.ts
`);
  expect(found).toStrictEqual([]);
});

layer(fixtureLayer)("workflow paths", (it) => {
  it.effect(
    "reports workflow paths, local actions, directories, scripts and hashFiles patterns that name nothing",
    () => reportsMissingPaths,
  );
  it.effect("accepts workflows whose paths all exist", () => acceptsExistingPaths);
});
