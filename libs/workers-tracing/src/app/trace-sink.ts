import { Effect, Logger, ManagedRuntime, Schema } from "effect";
import { Mac } from "effect/crypto";

import { TraceRequest, UnreadableBody, bodyOf, logTraceRequest } from "#/entities/span/index.ts";

type TraceSinkEnv = Readonly<{ TRACE_SINK_TOKEN: string }>;

const runtime = ManagedRuntime.make(
  Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]),
);

const encoder = new TextEncoder();

const digestOf = (text: string): Effect.Effect<Uint8Array> =>
  Effect.promise(() => crypto.subtle.digest("SHA-256", encoder.encode(text))).pipe(
    Effect.map((digest) => new Uint8Array(digest)),
  );

const isAuthorized = Effect.fn("otlp.authorized")(function* isAuthorized(
  request: Request,
  env: TraceSinkEnv,
) {
  const given = yield* digestOf(request.headers.get("authorization") ?? "");
  const expected = yield* digestOf(`Bearer ${env.TRACE_SINK_TOKEN}`);
  return Mac.timingSafeEqual(given, expected);
});

const receive = (request: Request, env: TraceSinkEnv): Effect.Effect<Response> =>
  Effect.gen(function* receiveTraces() {
    const authorized = yield* isAuthorized(request, env);
    if (!authorized) {
      yield* Effect.logWarning("otlp.unauthorized");
      return Response.json({});
    }
    const body = yield* Effect.tryPromise({
      try: () => bodyOf(request),
      catch: (cause) => UnreadableBody.make({ message: String(cause) }),
    });
    const traces = yield* Schema.decodeUnknownEffect(TraceRequest)(body);
    yield* logTraceRequest(traces);
    return Response.json({});
  }).pipe(
    Effect.catchCause((cause) =>
      Effect.logError("otlp.rejected", cause).pipe(
        Effect.annotateLogs({ contentEncoding: request.headers.get("content-encoding") }),
        Effect.as(new Response("", { status: 400 })),
      ),
    ),
  );

const worker = {
  fetch: (request: Request, env: TraceSinkEnv): Promise<Response> =>
    runtime.runPromise(receive(request, env)),
};

export default worker;
