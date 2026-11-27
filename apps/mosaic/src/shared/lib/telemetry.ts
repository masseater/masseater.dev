import { Duration, Effect, Layer, ManagedRuntime, Predicate } from "effect";
import { FetchHttpClient } from "effect/http";
import type { HttpClient } from "effect/http";
import { OtlpExporter, OtlpSerialization, OtlpTracer } from "effect/observability";

import { TELEMETRY_SERVICE, TRACES_PATH } from "#/shared/config/index.ts";

const EXPORT_INTERVAL = Duration.fromInputUnsafe("2 seconds");
const MAX_BATCH = 64;

const keepAlive = Layer.succeed(FetchHttpClient.RequestInit, { keepalive: true });

/** @internal */
export const browserTelemetry = (
  page: string,
): Layer.Layer<OtlpExporter.Flusher | HttpClient.HttpClient | FetchHttpClient.RequestInit> =>
  Layer.mergeAll(
    FetchHttpClient.layer,
    keepAlive,
    OtlpTracer.layer({
      url: new URL(TRACES_PATH, page).href,
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

const telemetryLayer = (): ReturnType<typeof browserTelemetry> | typeof serverTelemetry => {
  if (Predicate.hasProperty(globalThis, "document")) {
    return browserTelemetry(globalThis.location.href);
  }
  return serverTelemetry;
};

/** @internal */
export const runtime = ManagedRuntime.make(telemetryLayer());

/** @internal */
export const flushTraces = Effect.gen(function* flushTraces() {
  const flusher = yield* OtlpExporter.Flusher;
  yield* flusher.flush;
});
