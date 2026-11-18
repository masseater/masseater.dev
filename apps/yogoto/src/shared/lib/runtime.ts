import { endpointOf } from "@masseater.dev/desktop-telemetry";
import { Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/http";
import { OtlpSerialization, OtlpTracer } from "effect/observability";
import { Atom } from "effect/reactivity";

const SERVICE_NAME = "yogoto-screen";

const screenTraces = Layer.unwrap(
  Effect.sync(() =>
    OtlpTracer.layer({
      url: endpointOf("traces"),
      resource: { serviceName: SERVICE_NAME },
    }),
  ),
).pipe(Layer.provide(OtlpSerialization.layerJson), Layer.provide(FetchHttpClient.layer));

/** @internal */
export const runtime = Atom.runtime(Layer.mergeAll(FetchHttpClient.layer, screenTraces));
