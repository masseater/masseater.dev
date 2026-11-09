import { runMain } from "@effect/platform-node/NodeRuntime";
import { layer as nodeServicesLayer } from "@effect/platform-node/NodeServices";
import {
  ProblemList,
  RepositoryFiles,
  checkOverrides,
  checkRepository,
  formatProblem,
  nodeRepositoryFiles,
  sortProblems,
} from "@msch/core";
import type { Problem } from "@msch/core";
import { Cause, Effect, Layer, Option, Schema, Stdio, Stream, Array as Arr, pipe } from "effect";
import type { FileSystem, Path } from "effect";
import { FetchHttpClient } from "effect/http";
import { Otlp, OtlpSerialization } from "effect/observability";
import type { ChildProcessSpawner } from "effect/process";

import { JSON_FLAG } from "./cli-contract.ts";
import { ProblemsFound, writeStdout } from "./output.ts";

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
  const found = yield* Effect.all([checkRepository(root), checkOverrides(root)], {
    concurrency: "unbounded",
  });
  const problems = sortProblems(Arr.flatten(found));
  if (args.includes(JSON_FLAG)) {
    const text = yield* Schema.encodeEffect(Schema.fromJsonString(ProblemList))(problems);
    return yield* writeStdout(text);
  }
  return yield* reportText(root, problems);
});

const reportFailure = <Failure>(
  cause: Cause.Cause<Failure>,
): Effect.Effect<void, never, Stdio.Stdio> =>
  Effect.gen(function* report() {
    const stdio = yield* Stdio.Stdio;
    const failed = Cause.findErrorOption(cause).pipe(Option.exists(Schema.is(ProblemsFound)));
    if (failed) {
      return;
    }
    yield* Stream.make(`${Cause.pretty(cause)}\n`).pipe(Stream.run(stdio.stderr()), Effect.orDie);
  });

const tracing = Otlp.layerFromConfig({ resource: { serviceName: "msch" } }).pipe(
  Layer.provide(OtlpSerialization.layerJson),
  Layer.provide(FetchHttpClient.layer),
);

const runCli = <Value, Failure>(
  program: Effect.Effect<
    Value,
    Failure,
    | RepositoryFiles
    | Stdio.Stdio
    | FileSystem.FileSystem
    | Path.Path
    | ChildProcessSpawner.ChildProcessSpawner
  >,
): void => {
  const services = Layer.mergeAll(nodeRepositoryFiles, tracing).pipe(
    Layer.provideMerge(nodeServicesLayer),
  );
  const main = Layer.build(services).pipe(
    Effect.flatMap((context) =>
      Effect.provideContext(program.pipe(Effect.tapCause(reportFailure)), context),
    ),
    Effect.scoped,
  );
  runMain(main, { disableErrorReporting: true });
};

runCli(msch);
