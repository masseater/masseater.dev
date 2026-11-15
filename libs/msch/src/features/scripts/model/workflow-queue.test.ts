import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkWorkflowQueues } from "./workflow-queue.ts";

const EXPRESSION_START = "${{";

const lines = (text: readonly string[]): string => pipe([...text, ""], Arr.join("\n"));

const flagsQueuedConcurrency = Effect.gen(function* flagsQueuedConcurrency() {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith({
    ".github/workflows/verify.yml": lines([
      "concurrency:",
      "  group: verify",
      "  queue: max",
      "jobs:",
      "  deploy:",
      "    concurrency:",
      "      group: deploy",
      "      queue: max",
      "  verify:",
      "    concurrency:",
      `      group: verify-${EXPRESSION_START} github.ref }}`,
      "      cancel-in-progress: true",
      "  release:",
      "    concurrency: release",
    ]),
    ".github/actions/setup/action.yml": lines(["concurrency:", "  queue: max"]),
  });
  const problems = yield* checkWorkflowQueues(root);
  expect(
    pipe(
      sortProblems(problems),
      Arr.map(
        (problem) =>
          `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)}:${String(problem.column)} ${problem.rule}`,
      ),
    ),
  ).toStrictEqual([
    ".github/workflows/verify.yml:3:3 workflow-queue",
    ".github/workflows/verify.yml:8:7 workflow-queue",
  ]);
});

layer(fixtureLayer)("workflow concurrency", (it) => {
  it.effect("flags queue in workflow and job concurrency", () => flagsQueuedConcurrency);
});
