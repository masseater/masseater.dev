import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkAgentDocsLength } from "./agent-docs-length.ts";

const RECOMMENDED_LINES = 200;
const ONE_MORE = 1;
const OVER = RECOMMENDED_LINES + ONE_MORE;
const FAR_OVER = RECOMMENDED_LINES + RECOMMENDED_LINES;

const linesOf = (count: number): string =>
  `${pipe(
    Arr.makeBy(count, (index) => `- rule ${String(index)}`),
    Arr.join("\n"),
  )}\n`;

const flagsLongAgentDocs = Effect.gen(function* flagsLongAgentDocs() {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith({
    "AGENTS.md": linesOf(OVER),
    "CLAUDE.md": "@AGENTS.md\n",
    "apps/site/AGENTS.md": linesOf(RECOMMENDED_LINES),
    "docs/guide.md": linesOf(FAR_OVER),
  });
  const problems = yield* checkAgentDocsLength(root);
  expect(
    pipe(
      sortProblems(problems),
      Arr.map(
        (problem) =>
          `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
      ),
    ),
  ).toStrictEqual(["AGENTS.md:201 agent-docs-length"]);
});

layer(fixtureLayer)("agent docs length", (it) => {
  it.effect("flags AGENTS.md and CLAUDE.md over 200 lines", () => flagsLongAgentDocs);
});
