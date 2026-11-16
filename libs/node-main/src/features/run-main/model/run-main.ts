import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/http";
import type { HttpClient } from "effect/http";
import { OtlpSerialization, OtlpTracer } from "effect/observability";

type Platform = NodeServices.NodeServices | HttpClient.HttpClient;

type Run<Provided> = <Success, Failure>(
  program: Effect.Effect<Success, Failure, Platform | Provided>,
) => void;

const platform = Layer.mergeAll(NodeServices.layer, FetchHttpClient.layer);

const runWithTracingAnd =
  <Provided, LayerFailure>({
    serviceName,
    services,
  }: Readonly<{
    serviceName: string;
    services: Layer.Layer<Provided, LayerFailure, Platform>;
  }>): Run<Provided> =>
  (program) => {
    const tracing = OtlpTracer.layerFromConfig({ resource: { serviceName } }).pipe(
      Layer.provide(OtlpSerialization.layerJson),
      Layer.provide(FetchHttpClient.layer),
    );
    const provided = Layer.provideMerge(services, platform);
    NodeRuntime.runMain(
      Layer.build(Layer.mergeAll(tracing, provided)).pipe(
        Effect.flatMap((context) => Effect.provideContext(program, context)),
        Effect.scoped,
      ),
    );
  };

const runWithTracing = (serviceName: string): Run<never> =>
  runWithTracingAnd({ serviceName, services: Layer.empty });

/** @internal */
export const runMainWith = runWithTracingAnd;

/** @internal */
export const runMain = runWithTracing;
