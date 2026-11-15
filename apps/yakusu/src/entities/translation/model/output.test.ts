import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import { outputOf } from "./output.ts";

const settled = {
  data: Option.some("Hello"),
  failure: Option.none(),
  isPlaceholderData: false,
};

describe("outputOf", () => {
  it("shows nothing for an empty draft, even with an earlier translation", () => {
    expect(outputOf({ draft: "  ", query: settled })).toStrictEqual({ status: "empty" });
  });

  it("shows the translation streamed so far", () => {
    expect(outputOf({ draft: "こんにちは", query: settled })).toStrictEqual({
      status: "translated",
      text: "Hello",
      stale: false,
    });
  });

  it("marks the previous translation while the next one starts", () => {
    expect(
      outputOf({ draft: "こんにちは。", query: { ...settled, isPlaceholderData: true } }),
    ).toStrictEqual({ status: "translated", text: "Hello", stale: true });
  });

  it("waits for the first delta", () => {
    expect(
      outputOf({ draft: "こんにちは", query: { ...settled, data: Option.some("") } }),
    ).toStrictEqual({ status: "translating" });
  });

  it("shows the message of a failed translation", () => {
    expect(
      outputOf({
        draft: "こんにちは",
        query: { ...settled, failure: Option.some("翻訳エンジンが起動しません") },
      }),
    ).toStrictEqual({ status: "failed", message: "翻訳エンジンが起動しません" });
  });
});
