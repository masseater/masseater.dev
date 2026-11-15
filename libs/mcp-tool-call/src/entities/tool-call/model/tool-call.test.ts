import { expect, it } from "@effect/vitest";
import { Array as Arr, Effect, Schema, pipe } from "effect";

import { NO_PROJECT, one, toolCalls } from "./tool-call.ts";
import type { ToolCalls } from "./tool-call.ts";

const taggedError = Schema.TaggedError;

class Missing extends taggedError<Missing, { readonly brand: unique symbol }>()("Missing", {
  key: Schema.String,
}) {}

const CALLER = { client: "client-a", userAgent: "agent/1" };

const INPUT = { key: "x" };

const INPUT_BYTES = `{"key":"x"}`.length;

const NO_POINTS = 0;

const LATENCY_COLUMNS = 1;

type Recorded = Readonly<{
  points: AnalyticsEngineDataPoint[];
  withoutLatency: () => readonly unknown[];
  calls: ToolCalls<"lookup", Missing>;
}>;

const recorded = (): Recorded => {
  const points: AnalyticsEngineDataPoint[] = [];
  const dataset: AnalyticsEngineDataset = {
    writeDataPoint: (point) => {
      points.push(point ?? {});
    },
  };
  const calls = toolCalls<"lookup", Missing>({
    dataset: () => dataset,
    describe: ({ key }) => ({ errorTag: "Missing", text: `${key} was not found` }),
  });
  const withoutLatency = (): readonly unknown[] =>
    pipe(
      points,
      Arr.map((point) => ({ ...point, doubles: Arr.drop(point.doubles ?? [], LATENCY_COLUMNS) })),
    );
  return { points, withoutLatency, calls };
};

const Input = Schema.Struct({ key: Schema.NonEmptyString }).pipe(
  Schema.toStandardSchemaV1,
  Schema.toStandardJSONSchemaV1,
);

it.effect("成功した呼び出しは JSON の本文を返し、件数と ok を 1 行記録する", () =>
  Effect.gen(function* succeeded() {
    const { withoutLatency, calls } = recorded();
    const result = yield* Effect.promise(() =>
      calls.runTool({ tool: "lookup", caller: CALLER, project: "p", input: INPUT, count: one })(
        Effect.succeed({ found: "x" }),
      ),
    );
    expect(result).toStrictEqual({
      content: [{ type: "text", text: '{"found":"x"}' }],
      isError: false,
    });
    expect(withoutLatency()).toStrictEqual([
      {
        indexes: ["lookup"],
        blobs: ["lookup", "ok", "", "client-a", "p", "agent/1"],
        doubles: [INPUT_BYTES, '{"found":"x"}'.length, one()],
      },
    ]);
  }),
);

it.effect("失敗した呼び出しは describe の文言と _tag を返し、件数 0 で記録する", () =>
  Effect.gen(function* failed() {
    const { withoutLatency, calls } = recorded();
    const result = yield* Effect.promise(() =>
      calls.runTool({
        tool: "lookup",
        caller: CALLER,
        project: NO_PROJECT,
        input: INPUT,
        count: one,
      })(Effect.fail(Missing.make({ key: "x" }))),
    );
    expect(result).toStrictEqual({
      content: [{ type: "text", text: "x was not found" }],
      isError: true,
    });
    expect(withoutLatency()).toStrictEqual([
      {
        indexes: ["lookup"],
        blobs: ["lookup", "error", "Missing", "client-a", "", "agent/1"],
        doubles: [INPUT_BYTES, "x was not found".length, NO_POINTS],
      },
    ]);
  }),
);

it.effect("入力の検証で弾かれた呼び出しも InvalidInput で記録し、通った入力は記録しない", () =>
  Effect.gen(function* validated() {
    const { points, calls } = recorded();
    const schema = calls.meteredInput({ tool: "lookup", caller: CALLER, project: NO_PROJECT })(
      Input,
    );
    const passed = yield* Effect.promise(() =>
      Promise.resolve(schema["~standard"].validate(INPUT)),
    );
    expect(passed).toStrictEqual({ value: INPUT });
    expect(points).toHaveLength(NO_POINTS);
    const rejected = yield* Effect.promise(() =>
      Promise.resolve(schema["~standard"].validate({ key: "" })),
    );
    expect(rejected).toHaveProperty("issues");
    expect(
      pipe(
        points,
        Arr.map((point) => point.blobs),
      ),
    ).toStrictEqual([["lookup", "error", "InvalidInput", "client-a", "", "agent/1"]]);
  }),
);
