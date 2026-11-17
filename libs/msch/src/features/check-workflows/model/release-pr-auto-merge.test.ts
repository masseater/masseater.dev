import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkReleasePrAutoMerge } from "./release-pr-auto-merge.ts";

const lines = (text: readonly string[]): string => pipe([...text, ""], Arr.join("\n"));

const flagsReleasePrsWithoutAutoMerge = Effect.gen(function* flagsReleasePrsWithoutAutoMerge() {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith({
    ".github/workflows/release.yml": lines([
      "jobs:",
      "  stuck:",
      "    steps:",
      "      - uses: googleapis/release-please-action@v5",
      "        with:",
      "          skip-github-release: true",
      "  merged:",
      "    steps:",
      "      - id: please",
      "        uses: googleapis/release-please-action@v5",
      "      - if: steps.please.outputs.pr != ''",
      '        run: gh pr merge --auto --squash "$PR"',
      "  releases-only:",
      "    steps:",
      "      - uses: googleapis/release-please-action@v5",
      "        with:",
      "          skip-github-pull-request: true",
      "  merge-before:",
      "    steps:",
      "      - run: gh pr merge --auto --squash 1",
      "      - uses: googleapis/release-please-action@v5",
    ]),
  });
  const problems = yield* checkReleasePrAutoMerge(root);
  expect(
    pipe(
      sortProblems(problems),
      Arr.map(
        (problem) =>
          `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
      ),
    ),
  ).toStrictEqual([
    ".github/workflows/release.yml:4 release-pr-auto-merge",
    ".github/workflows/release.yml:21 release-pr-auto-merge",
  ]);
});

layer(fixtureLayer)("release PR auto-merge", (it) => {
  it.effect(
    "flags release-please steps that open a PR without turning on its auto-merge",
    () => flagsReleasePrsWithoutAutoMerge,
  );
});
