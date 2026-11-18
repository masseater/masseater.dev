import { OtelTracer } from "@effect/opentelemetry";
import { Layer } from "effect";
import { FetchHttpClient } from "effect/http";
import { Atom } from "effect/reactivity";

/** @internal */
export const runtime = Atom.runtime(Layer.mergeAll(FetchHttpClient.layer, OtelTracer.layerGlobal));
