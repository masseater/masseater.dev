import { Effect, Schema, String as Str } from "effect";
import { expect, test } from "vite-plus/test";

import { lapLine } from "./span.ts";

const START = 1000;
const END = 3500;
const FAILED = 1;
const NANOS_PER_MILLI = 1_000_000;
const decode = Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.Unknown));

test("writes one OTLP line whose span covers the command and carries its exit code", () =>
  Effect.runPromise(
    Effect.gen(function* written() {
      const line = yield* lapLine({
        name: "pre-push",
        command: ["vp", "run", "verify"],
        startMillis: START,
        endMillis: END,
        exitCode: FAILED,
      });
      const document = yield* decode(line);
      expect(Str.endsWith("\n")(line)).toBe(true);
      expect(document).toMatchObject({
        resourceSpans: [
          {
            scopeSpans: [
              {
                spans: [
                  {
                    name: "pre-push",
                    startTimeUnixNano: String(START * NANOS_PER_MILLI),
                    endTimeUnixNano: String(END * NANOS_PER_MILLI),
                    attributes: [
                      { key: "process.command_line", value: { stringValue: "vp run verify" } },
                      { key: "process.exit.code", value: { intValue: "1" } },
                    ],
                    status: { code: 2 },
                  },
                ],
              },
            ],
          },
        ],
      });
    }),
  ));
