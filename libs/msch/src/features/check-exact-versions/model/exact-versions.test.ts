import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkExactVersions, isRange } from "./exact-versions.ts";

const lines = (text: readonly string[]): string => pipe([...text, ""], Arr.join("\n"));

const FIXTURE = {
  "pnpm-workspace.yaml": lines([
    "catalog:",
    "  exact: 1.0.0",
    "  caret: ^1.0.0",
    "catalogs:",
    "  stack:",
    '    "@scope/tilde": ~2.0.0',
    "overrides:",
    "  kept: ^3.0.0",
  ]),
  "package.json": lines([
    "{",
    '  "private": true,',
    '  "dependencies": { "exact": "catalog:", "linked": "workspace:*" },',
    '  "devDependencies": { "floating": ">=1.0.0" },',
    '  "peerDependencies": { "peer": "^4.0.0" }',
    "}",
  ]),
};

const flagsRanges = Effect.gen(function* flagsRanges() {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith(FIXTURE);
  const problems = yield* checkExactVersions(root);
  expect(
    pipe(
      sortProblems(problems),
      Arr.map(
        (problem) =>
          `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
      ),
    ),
  ).toStrictEqual([
    "package.json:4 version-range",
    "pnpm-workspace.yaml:3 version-range",
    "pnpm-workspace.yaml:6 version-range",
  ]);
});

layer(fixtureLayer)("exact versions", (test) => {
  test.effect(
    "flags ranges in manifests and catalogs but not peer dependencies",
    () => flagsRanges,
  );
});

describe("isRange", () => {
  it.each(["^1.0.0", "~1.0.0", ">=1.0.0", "1.x", "*", "latest", "npm:other@^1.0.0"])(
    "treats %s as a range",
    (specifier) => {
      expect(isRange(specifier)).toBe(true);
    },
  );
  it.each([
    "1.0.0",
    "1.0.0-rc.5-ab785fc",
    "npm:@scope/other@1.0.0",
    "catalog:",
    "workspace:*",
    "link:../x",
    "github:owner/repo",
    "owner/repo#abc",
  ])("treats %s as exact", (specifier) => {
    expect(isRange(specifier)).toBe(false);
  });
});
