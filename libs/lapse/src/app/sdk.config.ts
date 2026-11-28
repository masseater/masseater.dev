import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { NodeSDK } from "@opentelemetry/sdk-node";

const sdk = new NodeSDK({ serviceName: "vitest", traceExporter: new OTLPTraceExporter() });

sdk.start();

export default sdk;
