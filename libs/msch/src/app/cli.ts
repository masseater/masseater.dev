#!/usr/bin/env node
import { VpToolsError, runVpa } from "@r_masseater/vite-plus-adopt";
import { Array as Arr, Effect, Schema, Stdio, Stream, pipe } from "effect";

import { JSON_FLAG } from "#/shared/lib/cli-contract.ts";
import { ProblemList, formatProblem, sortProblems } from "#/shared/lib/problem.ts";
import type { Problem } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

import { checkAll } from "./all-checks.ts";
import { ProblemsFound, writeStdout } from "./output.ts";
import { runCli } from "./runtime.ts";

const NO_PROBLEMS = 0;
const ONE_FAILURE = 1;
const NO_CONFIG = "config-missing";

const writeProblems = (
  root: string,
  problems: readonly Problem[],
): Effect.Effect<void, never, RepositoryFiles | Stdio.Stdio> =>
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
  });

const writeStderr = Effect.fn("writeStderr")(function* writeStderr(text: string) {
  const stdio = yield* Stdio.Stdio;
  yield* Stream.make(text).pipe(Stream.run(stdio.stderr()), Effect.orDie);
});

const failuresOf = (
  args: readonly string[],
  kind: string,
  message: string,
): Effect.Effect<number, never, Stdio.Stdio> => {
  if (Arr.isReadonlyArrayEmpty(args) && kind === NO_CONFIG) {
    return Effect.succeed(NO_PROBLEMS);
  }
  return writeStderr(`${message}\n`).pipe(Effect.as(ONE_FAILURE));
};

type VpaRun = ReturnType<typeof runVpa>;

const toolChecks = (
  root: string,
  args: readonly string[],
): Effect.Effect<
  number,
  Exclude<Effect.Error<VpaRun>, VpToolsError>,
  Effect.Services<VpaRun> | Stdio.Stdio
> =>
  runVpa(root, args).pipe(
    Effect.as(NO_PROBLEMS),
    Effect.catchIf(Schema.is(VpToolsError), (failure) =>
      failuresOf(args, failure.kind, failure.message),
    ),
  );

const failWhenAny = (count: number): Effect.Effect<void, ProblemsFound> => {
  if (count > NO_PROBLEMS) {
    return Effect.fail(ProblemsFound.make({ count }));
  }
  return Effect.void;
};

const writeJson = Effect.fn("writeJson")(function* writeJson(root: string) {
  const found = yield* checkAll(root);
  const text = yield* Schema.encodeEffect(Schema.fromJsonString(ProblemList))(sortProblems(found));
  return yield* writeStdout(text);
});

const checkEverything = Effect.fn("checkEverything")(function* checkEverything(root: string) {
  const found = yield* checkAll(root);
  const problems = sortProblems(found);
  yield* writeProblems(root, problems);
  const toolFailures = yield* toolChecks(root, []);
  return yield* failWhenAny(problems.length + toolFailures);
});

const msch = Effect.gen(function* msch() {
  const stdio = yield* Stdio.Stdio;
  const files = yield* RepositoryFiles;
  const args = yield* stdio.args;
  const root = files.resolve(".");
  if (args.includes(JSON_FLAG)) {
    return yield* writeJson(root);
  }
  if (Arr.isReadonlyArrayNonEmpty(args)) {
    return yield* toolChecks(root, args).pipe(Effect.flatMap(failWhenAny));
  }
  return yield* checkEverything(root);
});

runCli(msch);
