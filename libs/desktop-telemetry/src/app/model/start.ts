import { DocumentLoadInstrumentation } from "@opentelemetry/browser-instrumentation/experimental/document-load";
import { ErrorsInstrumentation } from "@opentelemetry/browser-instrumentation/experimental/errors";
import { FetchInstrumentation } from "@opentelemetry/browser-instrumentation/experimental/fetch";
import { LongAnimationFrameInstrumentation } from "@opentelemetry/browser-instrumentation/experimental/long-animation-frame";
import { NavigationInstrumentation } from "@opentelemetry/browser-instrumentation/experimental/navigation";
import { UserActionInstrumentation } from "@opentelemetry/browser-instrumentation/experimental/user-action";
import { WebVitalsInstrumentation } from "@opentelemetry/browser-instrumentation/experimental/web-vitals";
import { startBrowserSdk } from "@opentelemetry/browser-sdk";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace";

import { endpointOf, endpointPattern } from "#/shared/config/index.ts";

export type ScreenTelemetry = ReturnType<typeof startBrowserSdk>;

export const startScreenTelemetry = (serviceName: string): ScreenTelemetry =>
  startBrowserSdk({
    serviceName,
    logs: {
      processors: [
        new BatchLogRecordProcessor({ exporter: new OTLPLogExporter({ url: endpointOf("logs") }) }),
      ],
    },
    traces: {
      processors: [
        new BatchSpanProcessor({ exporter: new OTLPTraceExporter({ url: endpointOf("traces") }) }),
      ],
    },
    instrumentations: [
      new DocumentLoadInstrumentation(),
      new NavigationInstrumentation({ useNavigationApiIfAvailable: true }),
      new UserActionInstrumentation(),
      new FetchInstrumentation({ ignoreUrls: [endpointPattern()] }),
      new WebVitalsInstrumentation(),
      new LongAnimationFrameInstrumentation(),
      new ErrorsInstrumentation(),
    ],
  });
