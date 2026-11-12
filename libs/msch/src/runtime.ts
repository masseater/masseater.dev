import { runMain } from "@effect/platform-node-shared/NodeRuntime";
import { Cause, Effect, Layer, Option, Schema, Stdio, Stream } from "effect";
import type { FileSystem, Path } from "effect";
import { FetchHttpClient } from "effect/http";
import { Otlp, OtlpSerialization } from "effect/observability";
import type { ChildProcessSpawner } from "effect/process";

import { nodeServicesLayer } from "./node-services.ts";
import { ProblemsFound } from "./output.ts";
import { nodeRepositoryFiles } from "./repository-files.ts";
import type { RepositoryFiles } from "./repository-files.ts";

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

/** @internal */
export { runCli };
