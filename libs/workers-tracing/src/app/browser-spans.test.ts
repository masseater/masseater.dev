import { browserSpans } from "@r_masseater/workers-tracing/browser-spans";
import { Array, Effect, MutableRef, Option, Predicate, Schema, String, pipe } from "effect";
import { expect, test, vi } from "vite-plus/test";

const SERVICE = "mosaic-web";
const URL_PATH = "https://masseater.dev/mosaic/otlp/v1/traces";
const ACCEPTED = 202;
const REJECTED = 400;
const TOO_LARGE = 413;
const NOT_ALLOWED = 405;
const FORBIDDEN = 403;
const CHUNK = 16_384;
const CHUNKS = 64;
const READ_AT_MOST = 8;
const WIDE = 30_000;
const SPACE = 32;
const MANY = 300;
const LARGE = 70_000;
const ONE = 1;
const NONE = 0;

const receive = browserSpans({ service: SERVICE });

const encodeJson = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

const ORIGIN = "https://masseater.dev";

const postFrom = (headers: Readonly<Record<string, string>>, body: string): Request =>
  new Request(URL_PATH, { method: "POST", headers, body });

const post = (body: string): Request => postFrom({ origin: ORIGIN }, body);

const streamed = (produce: () => Option.Option<Uint8Array>): Request => {
  const init: RequestInit & Readonly<{ duplex: "half" }> = {
    method: "POST",
    headers: { origin: ORIGIN },
    body: new ReadableStream<Uint8Array>({
      pull: (controller): void => {
        Option.match(produce(), {
          onNone: () => {
            controller.close();
          },
          onSome: (chunk) => {
            controller.enqueue(chunk);
          },
        });
      },
    }),
    duplex: "half",
  };
  return new Request(URL_PATH, init);
};

const span = (name: string): Readonly<Record<string, unknown>> => ({
  traceId: "0af7651916cd43dd8448eb211c80319c",
  spanId: "b7ad6b7169203331",
  name,
  startTimeUnixNano: "1",
  endTimeUnixNano: "2",
  attributes: [{ key: "mosaic.gpu.live_devices", value: { intValue: "0" } }],
});

const tracesText = (service: string, names: readonly string[]): Effect.Effect<string> =>
  encodeJson({
    resourceSpans: [
      {
        resource: { attributes: [{ key: "service.name", value: { stringValue: service } }] },
        scopeSpans: [{ scope: { name: "mosaic" }, spans: pipe(names, Array.map(span)) }],
      },
    ],
  }).pipe(Effect.orDie);

const traces = (service: string, names: readonly string[]): Effect.Effect<Request> =>
  tracesText(service, names).pipe(Effect.map(post));

const isSpanLog = (line: unknown): boolean =>
  Predicate.hasProperty(line, "message") && line.message === "otlp.span";

const received = (request: Request): Effect.Effect<readonly [number, number]> =>
  Effect.gen(function* receiveOnce() {
    const info = vi.spyOn(console, "info").mockReturnValue();
    const log = vi.spyOn(console, "log").mockReturnValue();
    vi.spyOn(console, "warn").mockReturnValue();
    const { status } = yield* Effect.promise(() => receive(request));
    const spans = pipe(
      [...info.mock.calls, ...log.mock.calls],
      Array.flatten,
      Array.filter(isSpanLog),
    );
    vi.restoreAllMocks();
    return [status, spans.length] as const;
  });

test("ブラウザーの OTLP の JSON を受け、スパンを 1 つずつログに出す", () =>
  Effect.gen(function* acceptsSpans() {
    const result = yield* Effect.flatMap(traces(SERVICE, ["mosaic.page.hide"]), received);
    expect(result).toStrictEqual([ACCEPTED, ONE]);
  }).pipe(Effect.runPromise));

test("ほかのサービスを名乗るスパンはログに出さない", () =>
  Effect.gen(function* dropsOthers() {
    const result = yield* Effect.flatMap(traces("someone-else", ["x"]), received);
    expect(result).toStrictEqual([ACCEPTED, NONE]);
  }).pipe(Effect.runPromise));

test("OTLP でない本文・大きすぎる本文・多すぎるスパン・POST 以外を断る", () =>
  Effect.gen(function* rejects() {
    const many = yield* traces(
      SERVICE,
      Array.makeBy(MANY, () => "mosaic.gpu.device"),
    );
    const results = yield* Effect.forEach(
      [post("{"), post(String.repeat(LARGE)("x")), many, new Request(URL_PATH)],
      received,
      { concurrency: 1 },
    );
    expect(results).toStrictEqual([
      [REJECTED, NONE],
      [TOO_LARGE, NONE],
      [TOO_LARGE, NONE],
      [NOT_ALLOWED, NONE],
    ]);
  }).pipe(Effect.runPromise));

test("別のオリジンからの送信と、Origin の無い送信を断る", () =>
  Effect.gen(function* rejectsOtherOrigins() {
    const text = yield* tracesText(SERVICE, ["mosaic.page.hide"]);
    const results = yield* Effect.forEach(
      [
        postFrom({ origin: "https://attacker.example" }, text),
        postFrom({ origin: "null" }, text),
        postFrom({}, text),
      ],
      received,
      { concurrency: 1 },
    );
    expect(results).toStrictEqual([
      [FORBIDDEN, NONE],
      [FORBIDDEN, NONE],
      [FORBIDDEN, NONE],
    ]);
  }).pipe(Effect.runPromise));

test("Content-Length の無い大きな本文は、上限を超えたところで読むのをやめて断る", () =>
  Effect.gen(function* stopsReading() {
    const pulled = MutableRef.make(NONE);
    const request = streamed(() =>
      Option.liftPredicate(
        new Uint8Array(CHUNK).fill(SPACE),
        () => MutableRef.incrementAndGet(pulled) <= CHUNKS,
      ),
    );
    const result = yield* received(request);
    expect(result).toStrictEqual([TOO_LARGE, NONE]);
    expect(MutableRef.get(pulled)).toBeLessThan(READ_AT_MOST);
  }).pipe(Effect.runPromise));

test("上限は文字数ではなくバイト数で数える", () =>
  Effect.gen(function* countsBytes() {
    const request = yield* traces(SERVICE, [String.repeat(WIDE)("あ")]);
    const result = yield* received(request);
    expect(result).toStrictEqual([TOO_LARGE, NONE]);
  }).pipe(Effect.runPromise));
