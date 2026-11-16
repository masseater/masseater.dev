import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkCatalogEntries } from "./catalog-entries.ts";

const lines = (text: readonly string[]): string => pipe([...text, ""], Arr.join("\n"));

const FIXTURE = {
  "pnpm-workspace.yaml": lines([
    "catalog:",
    "  used: 1.0.0",
    "  unused: 1.0.0",
    "  overridden: 1.0.0",
    "catalogs:",
    "  stack:",
    "    effect: 4.1.4",
    "    typescript: 7.1.0",
    "overrides:",
    '  overridden: "catalog:"',
    "minimumReleaseAgeExclude:",
    '  - "@scope/kept@2.0.0"',
    "  - gone@1.0.0",
    "  - pattern-*",
  ]),
  "pnpm-lock.yaml": lines([
    "lockfileVersion: '9.0'",
    "",
    "packages:",
    "",
    "  '@scope/kept@2.0.0':",
    "    resolution: {integrity: sha512-AAAA}",
    "",
    "  used@1.0.0:",
    "    resolution: {integrity: sha512-BBBB}",
    "",
    "snapshots:",
    "",
    "  '@scope/kept@2.0.0': {}",
    "",
    "  used@1.0.0: {}",
  ]),
  "package.json": lines([
    "{",
    '  "dependencies": { "used": "catalog:" },',
    '  "devDependencies": { "effect": "catalog:stack" }',
    "}",
  ]),
};

const flagsUnusedAndStale = Effect.gen(function* flagsUnusedAndStale() {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith(FIXTURE);
  const problems = yield* checkCatalogEntries(root);
  expect(
    pipe(
      sortProblems(problems),
      Arr.map(
        (problem) =>
          `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
      ),
    ),
  ).toStrictEqual([
    "pnpm-workspace.yaml:3 unused-catalog-entry",
    "pnpm-workspace.yaml:8 unused-catalog-entry",
    "pnpm-workspace.yaml:13 stale-release-age-exclude",
  ]);
});

layer(fixtureLayer)("catalog entries", (it) => {
  it.effect(
    "flags unused catalog entries and excludes the lockfile no longer resolves",
    () => flagsUnusedAndStale,
  );
});
