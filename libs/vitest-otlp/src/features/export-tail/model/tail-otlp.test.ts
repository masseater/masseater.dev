import type { TailStream } from "@cloudflare/workers-types/index.ts";
import { Array as Arr, DateTime, pipe } from "effect";
import { Hex } from "effect/encoding";
import { expect, test } from "vite-plus/test";

import { invocationOf } from "./tail-events.ts";
import type { TailEvent } from "./tail-events.ts";
import { tracesOf } from "./tail-otlp.ts";

const TRACE_ID = "0af7651916cd43dd8448eb211c80319c";
const SPAN_ID = "b7ad6b7169203331";
const LINKED_TRACE_ID = "4bf92f3577b34da6a3ce929d0e0e4736";
const LINKED_SPAN_ID = "00f067aa0ba902b7";
const SAMPLED = 1;
const DROPPED = 2;
const EPOCH = 0;
const AT = DateTime.toDateUtc(DateTime.makeUnsafe(EPOCH));

const parent: TailStream.SpanContext = { traceId: TRACE_ID };
const own: TailStream.SpanContext = { traceId: TRACE_ID, spanId: SPAN_ID };

const onset: TailStream.Onset = {
  type: "onset",
  spanId: SPAN_ID,
  executionModel: "stateless",
  info: { type: "fetch", method: "GET", url: "https://example.com/", headers: [] },
};

const links: TailStream.SpanLinks = {
  type: "spanLinks",
  links: [
    {
      context: { traceId: LINKED_TRACE_ID, spanId: LINKED_SPAN_ID, traceFlags: SAMPLED },
      attributes: [{ name: "link.reason", value: "queue" }],
      droppedAttributesCount: DROPPED,
    },
  ],
};

const outcome: TailStream.Outcome = { type: "outcome", outcome: "ok", cpuTime: 0, wallTime: 0 };

const stream: readonly (readonly [TailStream.SpanContext, TailStream.EventType])[] = [
  [parent, onset],
  [own, links],
  [own, outcome],
];

test("a Worker span carries the links that the tail stream adds to it", () => {
  const events = pipe(
    stream,
    Arr.map(([spanContext, event], sequence): TailEvent => ({
      invocationId: "invocation",
      spanContext,
      timestamp: AT,
      sequence,
      event,
    })),
  );

  const linked = pipe(
    tracesOf(invocationOf("worker")(events)).resourceSpans,
    Arr.flatMap((resource) => resource.scopeSpans),
    Arr.flatMap((scope) => scope.spans),
    Arr.flatMap((span) => span.links),
    Arr.map((link) => ({
      traceId: Hex.encode(link.traceId),
      spanId: Hex.encode(link.spanId),
      flags: link.flags,
      attributes: link.attributes,
      droppedAttributesCount: link.droppedAttributesCount,
    })),
  );

  expect(linked).toMatchObject([
    {
      traceId: LINKED_TRACE_ID,
      spanId: LINKED_SPAN_ID,
      flags: SAMPLED,
      attributes: [
        { key: "link.reason", value: { value: { case: "stringValue", value: "queue" } } },
      ],
      droppedAttributesCount: DROPPED,
    },
  ]);
});
