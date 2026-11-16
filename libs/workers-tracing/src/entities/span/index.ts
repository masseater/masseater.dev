export { markedAt, missingOf, render, spanOf, traceOf } from "./lib/trace-tree.ts";
export type { ReceivedSpan } from "./lib/trace-tree.ts";
export {
  TraceRequest,
  UnreadableBody,
  bodyOf,
  logTraceRequest,
  serviceOf,
} from "./model/otlp-spans.ts";
export type { ResourceSpans } from "./model/otlp-spans.ts";
export { markCause, markFailed, recordStatus, requestSpans, traced } from "./model/span.ts";
