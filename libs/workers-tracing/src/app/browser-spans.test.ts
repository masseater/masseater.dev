import { browserSpans } from "@r_masseater/workers-tracing/browser-spans";
import { Array, Effect, Predicate, Schema, String, pipe } from "effect";
import { expect, test, vi } from "vite-plus/test";

const SERVICE = "mosaic-web";
const URL_PATH = "https://masseater.dev/mosaic/otlp/v1/traces";
const ACCEPTED = 202;
const REJECTED = 400;
const TOO_LARGE = 413;
const NOT_ALLOWED = 405;
const MANY = 300;
const LARGE = 70_000;
const ONE = 1;
const NONE = 0;

const receive = browserSpans({ service: SERVICE });

const encodeJson = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

const post = (body: string): Request => new Request(URL_PATH, { method: "POST", body });

const span = (name: string): Readonly<Record<string, unknown>> => ({
  traceId: "0af7651916cd43dd8448eb211c80319c",
  spanId: "b7ad6b7169203331",
  name,
  startTimeUnixNano: "1",
  endTimeUnixNano: "2",
  attributes: [{ key: "mosaic.gpu.live_devices", value: { intValue: "0" } }],
});

const traces = (service: string, names: readonly string[]): Effect.Effect<Request> =>
  encodeJson({
    resourceSpans: [
      {
        resource: { attributes: [{ key: "service.name", value: { stringValue: service } }] },
        scopeSpans: [{ scope: { name: "mosaic" }, spans: pipe(names, Array.map(span)) }],
      },
    ],
  }).pipe(Effect.orDie, Effect.map(post));

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
    );
    expect(results).toStrictEqual([
      [REJECTED, NONE],
      [TOO_LARGE, NONE],
      [TOO_LARGE, NONE],
      [NOT_ALLOWED, NONE],
    ]);
  }).pipe(Effect.runPromise));
