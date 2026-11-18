import { DocumentLoadInstrumentation } from "@opentelemetry/browser-instrumentation/experimental/document-load";
import { ErrorsInstrumentation } from "@opentelemetry/browser-instrumentation/experimental/errors";
import { FetchInstrumentation } from "@opentelemetry/browser-instrumentation/experimental/fetch";
import { LongAnimationFrameInstrumentation } from "@opentelemetry/browser-instrumentation/experimental/long-animation-frame";
import { NavigationInstrumentation } from "@opentelemetry/browser-instrumentation/experimental/navigation";
import { UserActionInstrumentation } from "@opentelemetry/browser-instrumentation/experimental/user-action";
import { WebVitalsInstrumentation } from "@opentelemetry/browser-instrumentation/experimental/web-vitals";
import type { Instrumentation } from "@opentelemetry/browser-sdk";

import { commandUrls, telemetryUrls } from "#/shared/config/index.ts";

export const instrumentations = (): Instrumentation[] => [
  new DocumentLoadInstrumentation(),
  new NavigationInstrumentation({ useNavigationApiIfAvailable: true }),
  new UserActionInstrumentation(),
  new FetchInstrumentation({
    ignoreUrls: [telemetryUrls()],
    propagateTraceHeaderCorsUrls: [commandUrls()],
  }),
  new WebVitalsInstrumentation(),
  new LongAnimationFrameInstrumentation(),
  new ErrorsInstrumentation(),
];
