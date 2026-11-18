import { startBrowserSdk } from "@opentelemetry/browser-sdk";

import { instrumentations } from "#/app/config/instrumentations.ts";
import { logProcessors, spanProcessors } from "#/app/config/processors.ts";

export type ScreenTelemetry = ReturnType<typeof startBrowserSdk>;

export const startScreenTelemetry = (serviceName: string): ScreenTelemetry =>
  startBrowserSdk({
    serviceName,
    logs: { processors: logProcessors() },
    traces: { processors: spanProcessors() },
    instrumentations: instrumentations(),
  });
