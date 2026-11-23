import { DateTime, Result } from "effect";
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
const FIRST = 0;
const SECOND = 1;
const NONE_DROPPED = 0;
const AT = DateTime.toDateUtc(DateTime.nowUnsafe());

const context = { traceId: TRACE_ID, spanId: SPAN_ID, invocationId: "invocation" };

const events: readonly TailEvent[] = [
  {
    invocationId: "invocation",
    spanContext: context,
    timestamp: AT,
    sequence: FIRST,
    event: {
      type: "onset",
      spanId: SPAN_ID,
      executionModel: "stateless",
      info: { type: "custom" },
    },
  },
  {
    invocationId: "invocation",
    spanContext: context,
    timestamp: AT,
    sequence: SECOND,
    event: {
      type: "spanLinks",
      links: [
        {
          context: { traceId: LINKED_TRACE_ID, spanId: LINKED_SPAN_ID, traceFlags: SAMPLED },
          attributes: [{ name: "link.kind", value: "queue" }],
          droppedAttributesCount: NONE_DROPPED,
        },
      ],
    },
  },
];

test("exports the links a spanLinks event adds to the span", () => {
  expect(tracesOf(invocationOf("worker")(events))).toMatchObject({
    resourceSpans: [
      {
        scopeSpans: [
          {
            spans: [
              {
                links: [
                  {
                    traceId: Result.getOrThrow(Hex.decode(LINKED_TRACE_ID)),
                    spanId: Result.getOrThrow(Hex.decode(LINKED_SPAN_ID)),
                    flags: SAMPLED,
                    attributes: [{ key: "link.kind" }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });
});
