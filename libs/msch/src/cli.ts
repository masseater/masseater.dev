#!/usr/bin/env node
import { Effect, Schema, Stdio, Array as Arr, pipe } from "effect";

import { checkAll } from "./all-checks.ts";
import { JSON_FLAG } from "./cli-contract.ts";
import { ProblemsFound, writeStdout } from "./output.ts";
import { ProblemList, formatProblem, sortProblems } from "./problem.ts";
import type { Problem } from "./problem.ts";
import { RepositoryFiles } from "./repository-files.ts";
import { runCli } from "./runtime.ts";

const NO_PROBLEMS = 0;

const reportText = (
  root: string,
  problems: readonly Problem[],
): Effect.Effect<void, ProblemsFound, RepositoryFiles | Stdio.Stdio> =>
  Effect.gen(function* report() {
    const files = yield* RepositoryFiles;
    const format = formatProblem((file) => files.relative(root, file));
    yield* writeStdout(
      pipe(
        problems,
        Arr.map((problem) => `${format(problem)}\n`),
        Arr.join(""),
      ),
    );
    if (problems.length > NO_PROBLEMS) {
      return yield* ProblemsFound.make({ count: problems.length });
    }
    return yield* Effect.void;
  });

const msch = Effect.gen(function* msch() {
  const stdio = yield* Stdio.Stdio;
  const files = yield* RepositoryFiles;
  const args = yield* stdio.args;
  const root = files.resolve(".");
  const found = yield* checkAll(root);
  const problems = sortProblems(found);
  if (args.includes(JSON_FLAG)) {
    const text = yield* Schema.encodeEffect(Schema.fromJsonString(ProblemList))(problems);
    return yield* writeStdout(text);
  }
  return yield* reportText(root, problems);
});

runCli(msch);
