import { Effect, Logger, ManagedRuntime, Schema } from "effect";

import { TraceRequest, UnreadableBody, bodyOf, logTraceRequest } from "./otlp-spans.ts";

type TraceSinkEnv = Readonly<{ TRACE_SINK_TOKEN: string }>;

const runtime = ManagedRuntime.make(
  Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]),
);

const receive = (request: Request, env: TraceSinkEnv): Effect.Effect<Response> =>
  Effect.gen(function* receiveTraces() {
    if (request.headers.get("authorization") !== `Bearer ${env.TRACE_SINK_TOKEN}`) {
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
