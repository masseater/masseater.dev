import { expect, it } from "@effect/vitest";
import { Effect, Schema } from "effect";

import { ERROR_TAG_META, RESULT_COUNT_META, one, toolCalls } from "./tool-call.ts";

const taggedError = Schema.TaggedError;

class Missing extends taggedError<Missing, { readonly brand: unique symbol }>()("Missing", {
  key: Schema.String,
}) {}

const { runTool } = toolCalls<Missing>({
  describe: ({ key }) => ({ errorTag: "Missing", text: `${key} was not found` }),
});

it.effect("成功した呼び出しは JSON の本文と件数を返す", () =>
  Effect.gen(function* succeeded() {
    const result = yield* Effect.promise(() =>
      runTool({ count: one })(Effect.succeed({ found: "x" })),
    );
    expect(result).toStrictEqual({
      content: [{ type: "text", text: '{"found":"x"}' }],
      isError: false,
      _meta: { [RESULT_COUNT_META]: one() },
    });
  }),
);

it.effect("失敗した呼び出しは describe の文言と _tag を返す", () =>
  Effect.gen(function* failed() {
    const result = yield* Effect.promise(() =>
      runTool({ count: one })(Effect.fail(Missing.make({ key: "x" }))),
    );
    expect(result).toStrictEqual({
      content: [{ type: "text", text: "x was not found" }],
      isError: true,
      _meta: { [ERROR_TAG_META]: "Missing" },
    });
  }),
);
