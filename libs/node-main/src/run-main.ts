import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/http";
import type { HttpClient } from "effect/http";
import { OtlpSerialization, OtlpTracer } from "effect/observability";

const runWithTracing =
  (serviceName: string) =>
  <Success, Failure>(
    program: Effect.Effect<Success, Failure, NodeServices.NodeServices | HttpClient.HttpClient>,
  ): void => {
    const tracing = OtlpTracer.layerFromConfig({ resource: { serviceName } }).pipe(
      Layer.provide(OtlpSerialization.layerJson),
      Layer.provide(FetchHttpClient.layer),
    );
    NodeRuntime.runMain(
      Layer.build(Layer.mergeAll(tracing, NodeServices.layer, FetchHttpClient.layer)).pipe(
        Effect.flatMap((context) => Effect.provideContext(program, context)),
        Effect.scoped,
      ),
    );
  };

/** @internal */
export const runMain = runWithTracing;
