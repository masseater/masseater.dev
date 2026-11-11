import { Duration, Effect, Layer, ManagedRuntime, Predicate } from "effect";
import { FetchHttpClient } from "effect/http";
import { OtlpExporter, OtlpSerialization, OtlpTracer } from "effect/observability";

import { TELEMETRY_SERVICE, TRACES_PATH } from "#/shared/config";

const EXPORT_INTERVAL = Duration.fromInputUnsafe("2 seconds");
const MAX_BATCH = 64;

const keepAlive = Layer.succeed(FetchHttpClient.RequestInit, { keepalive: true });

/** @internal */
const browserTelemetry = Layer.mergeAll(
  FetchHttpClient.layer,
  keepAlive,
  OtlpTracer.layer({
    url: TRACES_PATH,
    resource: { serviceName: TELEMETRY_SERVICE },
    exportInterval: EXPORT_INTERVAL,
    maxBatchSize: MAX_BATCH,
  }).pipe(
    Layer.provide(OtlpSerialization.layerJson),
    Layer.provide(FetchHttpClient.layer),
    Layer.provide(keepAlive),
  ),
);

const serverTelemetry = Layer.mergeAll(FetchHttpClient.layer, OtlpExporter.layerFlusher);

const telemetryLayer = (): typeof browserTelemetry | typeof serverTelemetry => {
  if (Predicate.hasProperty(globalThis, "document")) {
    return browserTelemetry;
  }
  return serverTelemetry;
};

/** @internal */
const runtime = ManagedRuntime.make(telemetryLayer());

/** @internal */
const flushTraces = Effect.gen(function* flushTraces() {
  const flusher = yield* OtlpExporter.Flusher;
  yield* flusher.flush;
});

export { browserTelemetry, flushTraces, runtime };
