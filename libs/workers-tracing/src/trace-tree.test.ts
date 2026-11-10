import { Array as Arr, Option, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { markedAt, missingOf, render, spanOf, traceOf } from "./trace-tree.ts";

const event = (annotations: Readonly<Record<string, unknown>>): unknown => ({
  source: { message: "otlp.span", annotations },
});

const spans = pipe(
  [
    event({
      service: "web",
      traceId: "t1",
      spanId: "a",
      spanName: "GET /",
      attributes: { url: { full: "https://example.com/?workers-traces=1" } },
      startTimeUnixNano: "1000000000",
      endTimeUnixNano: "1012000000",
    }),
    event({
      traceId: "t1",
      spanId: "b",
      parentSpanId: "a",
      spanName: "d1_all",
      startTimeUnixNano: "1001000000",
      endTimeUnixNano: "1003000000",
    }),
    event({ traceId: "t2", spanId: "c", spanName: "GET /other" }),
    { source: { message: "something else" } },
  ],
  Arr.map((value) => spanOf(value)),
  Arr.getSomes,
);

test("only otlp.span events become spans", () => {
  expect(
    pipe(
      spans,
      Arr.map(({ spanId }) => spanId),
    ),
  ).toStrictEqual(["a", "b", "c"]);
  expect(spanOf({ source: "plain text" })).toStrictEqual(Option.none());
});

const sent = traceOf("https://example.com/?workers-traces=1")(spans);

test("a sent request selects only the trace it started", () => {
  expect(
    pipe(
      sent,
      Arr.map(({ spanId }) => spanId),
    ),
  ).toStrictEqual(["a", "b"]);
});

test("a trace renders as an indented tree with durations", () => {
  expect(render(sent)).toBe("trace t1 web\n  GET / (12 ms)\n    d1_all (2 ms)");
});

test("expected span names that never arrived are reported", () => {
  expect(missingOf(["GET /", "d1_all", "todo.list"])(sent)).toStrictEqual(["todo.list"]);
});

const SENT_AT = 1_794_277_886_000;
const MARKED = "https://example.com/?page=2&workers-traces.mwa2q5gw=1";

test("a marked URL carries the send time in the name of an added parameter", () => {
  expect(markedAt(SENT_AT)("https://example.com/?page=2")).toBe(MARKED);
  expect(MARKED).not.toMatch(/\d{13,}/u);
});

const exported = pipe(
  [
    event({
      traceId: "t3",
      spanId: "d",
      spanName: "GET",
      attributes: { url: { full: "https://example.com/?page=2&workers-traces.mwa2q5gw=REDACTED" } },
    }),
    event({
      traceId: "t4",
      spanId: "e",
      spanName: "GET",
      attributes: { url: { full: "https://example.com/?page=2&workers-traces.mwa2q5gx=1" } },
    }),
    event({
      traceId: "t5",
      spanId: "f",
      spanName: "GET",
      attributes: { url: { full: "https://example.com/?page=2" } },
    }),
    event({
      traceId: "t6",
      spanId: "g",
      spanName: "GET",
      attributes: { url: { full: "/?page=2&workers-traces.mwa2q5gw=1" } },
    }),
  ],
  Arr.map((value) => spanOf(value)),
  Arr.getSomes,
);

const found = pipe(
  traceOf(MARKED)(exported),
  Arr.map(({ spanId }) => spanId),
);

test("a request is still found after the exporter replaced a query value", () => {
  expect(found).toContain("d");
});

test("a request marked at another time, an unmarked one and a relative URL are not selected", () => {
  expect(found).toStrictEqual(["d"]);
});
