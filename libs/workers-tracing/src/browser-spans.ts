import { Array as Arr, Effect, Logger, ManagedRuntime, Schema, pipe } from "effect";

import type { ResourceSpans } from "./otlp-spans.ts";
import { TraceRequest, logTraceRequest, serviceOf } from "./otlp-spans.ts";

const MAX_BYTES = 65_536;
const MAX_SPANS = 256;
const ACCEPTED = 202;
const REJECTED = 400;
const TOO_LARGE = 413;
const NOT_ALLOWED = 405;

interface BrowserSpansOptions {
  readonly service: string;
}

const taggedError = Schema.TaggedError;

class RejectedSpans extends taggedError<RejectedSpans, { readonly brand: unique symbol }>()(
  "RejectedSpans",
  { status: Schema.Int, reason: Schema.String },
) {}

const decodeRequest = Schema.decodeUnknownEffect(Schema.fromJsonString(TraceRequest));

const reject = (status: number, reason: string): RejectedSpans =>
  RejectedSpans.make({ status, reason });

const declaredLength = (request: Request): number =>
  Number(request.headers.get("content-length") ?? "0");

const textWithin = (request: Request): Effect.Effect<string, RejectedSpans> =>
  Effect.gen(function* readWithin() {
    if (declaredLength(request) > MAX_BYTES) {
      return yield* reject(TOO_LARGE, "declared body too large");
    }
    const text = yield* Effect.tryPromise({
      try: () => request.text(),
      catch: () => reject(REJECTED, "unreadable body"),
    });
    if (text.length > MAX_BYTES) {
      return yield* reject(TOO_LARGE, "body too large");
    }
    return text;
  });

const ofService =
  (service: string) =>
  (resourceSpans: typeof ResourceSpans.Type): boolean =>
    serviceOf(resourceSpans) === service;

const spanCount = (resourceSpans: readonly (typeof ResourceSpans.Type)[]): number =>
  pipe(
    resourceSpans,
    Arr.flatMap(({ scopeSpans }) => scopeSpans),
    Arr.flatMap(({ spans }) => spans),
    Arr.length,
  );

const receive = (
  service: string,
  request: Request,
): Effect.Effect<typeof TraceRequest.Type, RejectedSpans> =>
  Effect.gen(function* receiveBrowserSpans() {
    if (request.method !== "POST") {
      return yield* reject(NOT_ALLOWED, "method not allowed");
    }
    const text = yield* textWithin(request);
    const decoded = yield* decodeRequest(text).pipe(
      Effect.mapError(() => reject(REJECTED, "not an OTLP JSON trace request")),
    );
    const resourceSpans = pipe(decoded.resourceSpans, Arr.filter(ofService(service)));
    if (spanCount(resourceSpans) > MAX_SPANS) {
      return yield* reject(TOO_LARGE, "too many spans");
    }
    return { resourceSpans };
  });

const runtime = ManagedRuntime.make(
  Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]),
);

const empty = (status: number): Response => new Response("", { status });

const rejected = ({
  status,
  reason,
}: Readonly<{ status: number; reason: string }>): Effect.Effect<Response> =>
  Effect.logWarning("otlp.browser_rejected").pipe(
    Effect.annotateLogs({ reason }),
    Effect.as(empty(status)),
  );

const respond = (service: string, request: Request): Effect.Effect<Response> =>
  receive(service, request).pipe(
    Effect.flatMap(logTraceRequest),
    Effect.as(empty(ACCEPTED)),
    Effect.catchTag("RejectedSpans", rejected),
  );

const browserSpans =
  ({ service }: BrowserSpansOptions) =>
  (request: Request): Promise<Response> =>
    runtime.runPromise(respond(service, request));

export type { BrowserSpansOptions };
export { browserSpans };
