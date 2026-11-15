import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkWorkflows } from "./workflows.ts";

const EXPRESSION_START = "${{";

const workflowWith = (steps: readonly string[]): string =>
  pipe(["jobs:", "  verify:", "    steps:", ...steps, ""], Arr.join("\n"));

const findingsFor = Effect.fn("findingsFor")(function* findingsFor(
  files: Readonly<Record<string, string>>,
) {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith(files);
  const problems = yield* checkWorkflows(root);
  return pipe(
    sortProblems(problems),
    Arr.map(
      (problem) =>
        `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
    ),
  );
});

const flagsStepsWithMoreThanOneCommand = Effect.gen(function* flagsStepsWithMoreThanOneCommand() {
  const findings = yield* findingsFor({
    ".github/workflows/verify.yml": workflowWith([
      "      - run: |",
      "          vp install",
      "          vp run verify",
      "      - run: gh api repos | jq .name",
      "      - run: vp run build && vp run deploy",
      "      - run: vp run verify",
      "      - run: >-",
      "          gh workflow run autofix.yml",
      '          -f branch="$HEAD_BRANCH"',
      `      - run: vp run deploy -- --stage ${EXPRESSION_START} inputs.stage || 'prod' }}`,
      '      - run: echo "a && b; c | d"',
    ]),
    ".github/actions/setup/action.yml": pipe(
      ["runs:", "  using: composite", "  steps:", "    - run: |", "        a", "        b", ""],
      Arr.join("\n"),
    ),
  });
  expect(findings).toStrictEqual([
    ".github/workflows/verify.yml:4 workflow-script",
    ".github/workflows/verify.yml:7 workflow-script",
    ".github/workflows/verify.yml:8 workflow-script",
  ]);
});

layer(fixtureLayer)("workflows stay thin", (it) => {
  it.effect(
    "flags workflow steps that run more than one command, but not composite actions",
    () => flagsStepsWithMoreThanOneCommand,
  );
});
