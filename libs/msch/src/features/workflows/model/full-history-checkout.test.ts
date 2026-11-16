import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkFullHistoryCheckout } from "./full-history-checkout.ts";

const lines = (text: readonly string[]): string => pipe([...text, ""], Arr.join("\n"));

const flagsWholeHistory = Effect.gen(function* flagsWholeHistory() {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith({
    ".github/workflows/verify.yml": lines([
      "jobs:",
      "  verify:",
      "    steps:",
      "      - uses: actions/checkout@v6",
      "        with:",
      "          fetch-depth: 0",
      "      - uses: actions/checkout@v6",
      "        with: { fetch-depth: '0' }",
      "      - uses: actions/checkout@v6",
      "        with:",
      "          fetch-depth: 2",
      "      - uses: actions/checkout@v6",
      "        with:",
      "          fetch-depth:",
    ]),
  });
  const problems = yield* checkFullHistoryCheckout(root);
  expect(
    pipe(
      sortProblems(problems),
      Arr.map(
        (problem) =>
          `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)}:${String(problem.column)} ${problem.rule}`,
      ),
    ),
  ).toStrictEqual([
    ".github/workflows/verify.yml:6:11 full-history-checkout",
    ".github/workflows/verify.yml:8:17 full-history-checkout",
  ]);
});

layer(fixtureLayer)("full history checkout", (it) => {
  it.effect("flags fetch-depth 0 and keeps shallow or empty depths", () => flagsWholeHistory);
});
