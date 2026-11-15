import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import { swapped } from "./swap.ts";

describe("swapped", () => {
  it("swaps two chosen languages", () => {
    expect(
      swapped({
        source: { kind: "language", code: "en" },
        direction: { source: Option.some("en"), target: "ja", detected: Option.none() },
      }),
    ).toStrictEqual({ source: { kind: "language", code: "ja" }, target: "en" });
  });

  it("uses the detected language as the new target", () => {
    expect(
      swapped({
        source: { kind: "detect" },
        direction: { source: Option.none(), target: "ko", detected: Option.some("ja") },
      }),
    ).toStrictEqual({ source: { kind: "language", code: "ko" }, target: "ja" });
  });

  it("assumes English and Japanese when nothing was detected", () => {
    expect(
      swapped({
        source: { kind: "detect" },
        direction: { source: Option.none(), target: "ja", detected: Option.none() },
      }),
    ).toStrictEqual({ source: { kind: "language", code: "ja" }, target: "en" });
  });
});
