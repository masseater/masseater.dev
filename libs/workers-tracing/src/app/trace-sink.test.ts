import { Array, Effect, Predicate, Schema, pipe } from "effect";
import { expect, test, vi } from "vite-plus/test";

import worker from "./trace-sink.ts";

const TOKEN = "0123456789abcdef0123456789abcdef";
const SAME_LENGTH_TOKEN = "0123456789abcdef0123456789abcdeX";
const URL_PATH = "https://sink.example/v1/traces";
const ONE = 1;
const NONE = 0;

const encodeJson = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

const body = encodeJson({
  resourceSpans: [
    {
      scopeSpans: [
        {
          spans: [
            {
              traceId: "0af7651916cd43dd8448eb211c80319c",
              spanId: "b7ad6b7169203331",
              name: "GET /",
            },
          ],
        },
      ],
    },
  ],
}).pipe(Effect.orDie);

const isSpanLog = (line: unknown): boolean =>
  Predicate.hasProperty(line, "message") && line.message === "otlp.span";

const spansLoggedWith = (headers: Readonly<Record<string, string>>): Effect.Effect<number> =>
  Effect.gen(function* receiveOnce() {
    const text = yield* body;
    const info = vi.spyOn(console, "info").mockReturnValue();
    const log = vi.spyOn(console, "log").mockReturnValue();
    vi.spyOn(console, "warn").mockReturnValue();
    yield* Effect.promise(() =>
      worker.fetch(new Request(URL_PATH, { method: "POST", headers, body: text }), {
        TRACE_SINK_TOKEN: TOKEN,
      }),
    );
    const spans = pipe(
      [...info.mock.calls, ...log.mock.calls],
      Array.flatten,
      Array.filter(isSpanLog),
    );
    vi.restoreAllMocks();
    return spans.length;
  });

test("トークンが合う送信のスパンをログに出す", () =>
  Effect.gen(function* acceptsToken() {
    const logged = yield* spansLoggedWith({ authorization: `Bearer ${TOKEN}` });
    expect(logged).toBe(ONE);
  }).pipe(Effect.runPromise));

test("トークンが違う送信・短い送信・無い送信のスパンはログに出さない", () =>
  Effect.gen(function* rejectsOthers() {
    const logged = yield* Effect.forEach(
      [
        { authorization: `Bearer ${SAME_LENGTH_TOKEN}` },
        { authorization: "Bearer 0123" },
        { authorization: TOKEN },
        {},
      ],
      spansLoggedWith,
      { concurrency: 1 },
    );
    expect(logged).toStrictEqual([NONE, NONE, NONE, NONE]);
  }).pipe(Effect.runPromise));
