import { describe, expect, it } from "@effect/vitest";
import { Array as Arr } from "effect";

import { blinkPatterns, blinkState } from "./blink.ts";
import type { Blink } from "./blink.ts";

const FPS = 30;
const blink: Blink = { kind: "blink", closed: "閉じ", half: "半目", open: "開き" };

const statesFrom = ({
  from,
  count,
}: Readonly<{ from: number; count: number }>): readonly string[] =>
  Arr.makeBy(count, (offset) => blinkState({ blink, frame: from + offset, fps: FPS }));

describe("blinkPatterns", () => {
  it("orders the patterns from closed to open", () => {
    expect(blinkPatterns(blink)).toStrictEqual(["閉じ", "半目", "開き"]);
  });

  it("starts from the next-to-open pattern when there are more than three", () => {
    expect(blinkPatterns({ ...blink, almostClosed: "ほぼ閉じ" })).toStrictEqual([
      "半目",
      "閉じ",
      "ほぼ閉じ",
      "半目",
      "開き",
    ]);
  });
});

describe("blinkState", () => {
  it("closes and opens the eyes one pattern per frame", () => {
    expect(statesFrom({ from: 0, count: 5 })).toStrictEqual([
      "開き",
      "閉じ",
      "半目",
      "開き",
      "開き",
    ]);
  });

  it("blinks again after the interval", () => {
    expect(statesFrom({ from: 126, count: 3 })).toStrictEqual(["開き", "閉じ", "半目"]);
  });

  it("adds a second blink every fifth interval", () => {
    expect(statesFrom({ from: 501, count: 3 })).toStrictEqual(["開き", "閉じ", "半目"]);
  });
});
