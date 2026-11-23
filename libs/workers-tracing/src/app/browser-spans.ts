import {
  Array as Arr,
  Effect,
  Logger,
  ManagedRuntime,
  Option,
  Predicate,
  Schema,
  Stream,
  pipe,
} from "effect";

import type { ResourceSpans } from "#/entities/span/index.ts";
import { TraceRequest, logTraceRequest, serviceOf } from "#/entities/span/index.ts";

const MAX_BYTES = 65_536;
const MAX_SPANS = 256;
const ACCEPTED = 202;
const REJECTED = 400;
const TOO_LARGE = 413;
const NOT_ALLOWED = 405;
const FORBIDDEN = 403;

export interface BrowserSpansOptions {
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

const hostOf = (url: string): Option.Option<string> =>
  pipe(
    Option.liftPredicate(url, (candidate) => URL.canParse(candidate)),
    Option.map((parsed) => new URL(parsed).host),
  );

const isSameOrigin = (request: Request): boolean =>
  pipe(
    Option.fromNullishOr(request.headers.get("origin")),
    Option.flatMap(hostOf),
    Option.exists((host) => host === new URL(request.url).host),
  );

interface Read {
  readonly bytes: number;
  readonly chunks: readonly Uint8Array[];
}

const NOTHING_READ: Read = { bytes: 0, chunks: [] };

const isOver = ({ bytes }: Read): boolean => bytes > MAX_BYTES;

const textOf = (chunks: readonly Uint8Array[]): string => {
  const decoder = new TextDecoder();
  return pipe(
    chunks,
    Arr.map((chunk) => decoder.decode(chunk, { stream: true })),
    Arr.join(""),
  );
};

const bodyWithin = (
  evaluate: () => ReadableStream<unknown>,
): Effect.Effect<string, RejectedSpans> =>
  Stream.fromReadableStream({
    evaluate,
    onError: () => reject(REJECTED, "unreadable body"),
  }).pipe(
    Stream.filter(Predicate.isUint8Array),
    Stream.scan(
      () => NOTHING_READ,
      ({ bytes, chunks }, chunk): Read => ({
        bytes: bytes + chunk.byteLength,
        chunks: [...chunks, chunk],
      }),
    ),
    Stream.takeUntil(isOver),
    Stream.runLast,
    Effect.map(Option.getOrElse(() => NOTHING_READ)),
    Effect.filterOrFail(
      (read) => !isOver(read),
      () => reject(TOO_LARGE, "body too large"),
    ),
    Effect.map(({ chunks }) => textOf(chunks)),
  );

const textWithin = (request: Request): Effect.Effect<string, RejectedSpans> =>
  Effect.gen(function* readWithin() {
    if (declaredLength(request) > MAX_BYTES) {
      return yield* reject(TOO_LARGE, "declared body too large");
    }
    return yield* Option.match(Option.fromNullishOr(request.body), {
      onNone: () => Effect.succeed(""),
      onSome: (body) => bodyWithin(() => body),
    });
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
    if (!isSameOrigin(request)) {
      return yield* reject(FORBIDDEN, "not a same-origin request");
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

export const browserSpans =
  ({ service }: BrowserSpansOptions) =>
  (request: Request): Promise<Response> =>
    runtime.runPromise(respond(service, request));
