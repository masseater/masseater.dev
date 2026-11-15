import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkWorkflowScale } from "./workflow-scale.ts";

const SCOPED = `name: web
on:
  push:
    branches: [main]
    paths:
      - "apps/**"
  pull_request:
    paths-ignore:
      - "*.md"
jobs:
  mosaic-plan:
    runs-on: ubuntu-latest
    steps:
      - uses: dorny/paths-filter@v3
      - run: vp run --filter ./apps/web build
      - run: vp run -F "@scope/web" build
      - run: node apps/mosaic/scripts/plan.ts
`;

const GENERIC = `name: verify
on:
  push:
    branches: [main]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: ./.github/actions/setup
      - run: vp run -r verify
      - run: vp run --filter "./$DIRECTORY" release:linux
`;

const problemsFor = Effect.fn("problemsFor")(function* problemsFor(
  files: Readonly<Record<string, string>>,
) {
  const root = yield* gitRepositoryWith({
    "apps/mosaic/package.json": '{"name":"@scope/mosaic"}',
    "apps/mosaic/scripts/plan.ts": "",
    "apps/web/package.json": '{"name":"@scope/web"}',
    "package.json": "{}",
    ...files,
  });
  const problems = yield* checkWorkflowScale(root);
  return pipe(
    problems,
    Arr.map(({ line, rule }) => `${line} ${rule}`),
    Arr.sort((left: string, right: string) => left.localeCompare(right, "en", { numeric: true })),
  );
});

const reportsScopedWorkflows = Effect.gen(function* reportsScopedWorkflows() {
  const found = yield* problemsFor({
    ".github/actions/web/action.yml": "runs:\n  using: composite\n  steps: []\n",
    ".github/workflows/mosaic.yml": SCOPED,
  });
  expect(found).toStrictEqual([
    "1 workflow-package",
    "1 workflow-package",
    "1 workflow-package",
    "5 workflow-path-filter",
    "8 workflow-path-filter",
    "11 workflow-package",
    "14 workflow-path-filter",
    "15 workflow-package",
    "16 workflow-package",
    "17 workflow-package",
  ]);
});

const acceptsGenericWorkflows = Effect.gen(function* acceptsGenericWorkflows() {
  const found = yield* problemsFor({
    ".github/actions/setup/action.yml": "runs:\n  using: composite\n  steps: []\n",
    ".github/workflows/verify.yml": GENERIC,
  });
  expect(found).toStrictEqual([]);
});

layer(fixtureLayer)("workflow scale", (it) => {
  it.effect(
    "reports path filters and workflows, jobs, actions and steps that name one workspace",
    () => reportsScopedWorkflows,
  );
  it.effect("accepts workflows that run the same task in every workspace", () =>
    acceptsGenericWorkflows,
  );
});
