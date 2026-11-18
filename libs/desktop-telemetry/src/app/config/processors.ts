import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace";

import { endpointOf } from "#/shared/config/index.ts";

export const logProcessors = (): BatchLogRecordProcessor[] => {
  const exporter = new OTLPLogExporter({ url: endpointOf("logs") });
  return [new BatchLogRecordProcessor({ exporter })];
};

export const spanProcessors = (): BatchSpanProcessor[] => {
  const exporter = new OTLPTraceExporter({ url: endpointOf("traces") });
  return [new BatchSpanProcessor({ exporter })];
};
