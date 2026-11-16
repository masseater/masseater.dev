import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkWorkflowCommits } from "./workflow-commits.ts";

const lines = (text: readonly string[]): string => pipe([...text, ""], Arr.join("\n"));

const flagsCommits = Effect.gen(function* flagsCommits() {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith({
    ".github/workflows/readme.yml": lines([
      "jobs:",
      "  readme:",
      "    steps:",
      "      - run: git -c user.name=bot commit -am readme",
      "      - run: |",
      "          vp run readme",
      "          git push origin HEAD",
      "      - uses: stefanzweifel/git-auto-commit-action@v6",
      "      - run: git diff --exit-code",
      "      - uses: actions/checkout@v6",
    ]),
  });
  const problems = yield* checkWorkflowCommits(root);
  expect(
    pipe(
      sortProblems(problems),
      Arr.map(
        (problem) =>
          `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
      ),
    ),
  ).toStrictEqual([
    ".github/workflows/readme.yml:4 workflow-commit",
    ".github/workflows/readme.yml:5 workflow-commit",
    ".github/workflows/readme.yml:8 workflow-commit",
  ]);
});

layer(fixtureLayer)("workflow commits", (it) => {
  it.effect("flags git commit, git push and commit actions in workflow steps", () => flagsCommits);
});
