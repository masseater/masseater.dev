import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import { resolveDirection } from "./direction.ts";

const DETECT = { kind: "detect" } as const;

describe("resolveDirection", () => {
  it("keeps a chosen source language", () => {
    expect(
      resolveDirection({ text: "Hello", source: { kind: "language", code: "en" }, target: "ja" }),
    ).toStrictEqual({ source: Option.some("en"), target: "ja", detected: Option.none() });
  });

  it("leaves detection to the model for text without kana", () => {
    expect(resolveDirection({ text: "Hello", source: DETECT, target: "ja" })).toStrictEqual({
      source: Option.none(),
      target: "ja",
      detected: Option.none(),
    });
  });

  it("translates detected Japanese into English when Japanese is the target", () => {
    expect(resolveDirection({ text: "こんにちは", source: DETECT, target: "ja" })).toStrictEqual({
      source: Option.none(),
      target: "en",
      detected: Option.some("ja"),
    });
  });

  it("keeps another target for detected Japanese", () => {
    expect(resolveDirection({ text: "こんにちは", source: DETECT, target: "ko" })).toStrictEqual({
      source: Option.none(),
      target: "ko",
      detected: Option.some("ja"),
    });
  });
});
