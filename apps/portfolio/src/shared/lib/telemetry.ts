import { Duration, Layer, ManagedRuntime, Predicate } from "effect";
import { FetchHttpClient } from "effect/http";
import { OtlpExporter, OtlpSerialization, OtlpTracer } from "effect/observability";

import { site } from "#/shared/config/index.ts";

const EXPORT_INTERVAL = Duration.fromInputUnsafe("2 seconds");
const MAX_BATCH = 64;

const keepAlive = Layer.succeed(FetchHttpClient.RequestInit, { keepalive: true });

const browserTelemetry = OtlpTracer.layer({
  url: site.tracesPath,
  resource: { serviceName: site.telemetryService },
  exportInterval: EXPORT_INTERVAL,
  maxBatchSize: MAX_BATCH,
}).pipe(
  Layer.provide(OtlpSerialization.layerJson),
  Layer.provide(FetchHttpClient.layer),
  Layer.provide(keepAlive),
);

const telemetryLayer = (): typeof browserTelemetry => {
  if (Predicate.hasProperty(globalThis, "document")) {
    return browserTelemetry;
  }
  return OtlpExporter.layerFlusher;
};

export const browserRuntime = ManagedRuntime.make(telemetryLayer());
