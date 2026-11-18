import { OtelTracer } from "@effect/opentelemetry";

export const screenTracer = OtelTracer.layerGlobal;
