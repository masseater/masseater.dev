import { Duration, Effect, Layer, ManagedRuntime, Predicate } from "effect";
import { FetchHttpClient } from "effect/http";
import { OtlpExporter, OtlpSerialization, OtlpTracer } from "effect/observability";

import { TELEMETRY_SERVICE, TRACES_PATH } from "#/shared/config";

const EXPORT_INTERVAL = Duration.fromInputUnsafe("2 seconds");
const MAX_BATCH = 64;

const inBrowser = (): boolean => Predicate.hasProperty(globalThis, "document");

const keepAlive = Layer.succeed(FetchHttpClient.RequestInit, { keepalive: true });

const browserTracing = OtlpTracer.layer({
  url: TRACES_PATH,
  resource: { serviceName: TELEMETRY_SERVICE },
  exportInterval: EXPORT_INTERVAL,
  maxBatchSize: MAX_BATCH,
}).pipe(
  Layer.provide(OtlpSerialization.layerJson),
  Layer.provide(FetchHttpClient.layer),
  Layer.provide(keepAlive),
);

const flushing = (): Layer.Layer<OtlpExporter.Flusher> => {
  if (inBrowser()) {
    return browserTracing;
  }
  return OtlpExporter.layerFlusher;
};

/** @internal */
const runtime = ManagedRuntime.make(Layer.mergeAll(FetchHttpClient.layer, flushing()));

/** @internal */
const flushTraces = Effect.gen(function* flushTraces() {
  const flusher = yield* OtlpExporter.Flusher;
  yield* flusher.flush;
});

export { flushTraces, runtime };
