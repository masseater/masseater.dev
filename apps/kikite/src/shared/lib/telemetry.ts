import { Duration, Layer } from "effect";
import { FetchHttpClient } from "effect/http";
import { OtlpSerialization, OtlpTracer } from "effect/observability";

import { TELEMETRY_SERVICE, TRACES_PATH } from "#config";

const EXPORT_INTERVAL = Duration.fromInputUnsafe("2 seconds");
const MAX_BATCH = 64;

const keepAlive = Layer.succeed(FetchHttpClient.RequestInit, { keepalive: true });

/** @internal */
export const telemetry = OtlpTracer.layer({
  url: TRACES_PATH,
  resource: { serviceName: TELEMETRY_SERVICE },
  exportInterval: EXPORT_INTERVAL,
  maxBatchSize: MAX_BATCH,
}).pipe(
  Layer.provide(OtlpSerialization.layerJson),
  Layer.provide(FetchHttpClient.layer),
  Layer.provide(keepAlive),
);
