import { describe, expect, it } from "vite-plus/test";

import { accuracyOf, charF1Of } from "./score.ts";

const ALL = 1;

const NONE = 0;

const HALF = 0.5;

describe("accuracyOf", () => {
  it("ignores whitespace and full-width forms", () => {
    expect(accuracyOf({ answer: "ＡＢ　ｃ\n１２", truth: "AB c12" })).toBe(ALL);
  });

  it("counts two errors out of four characters", () => {
    expect(accuracyOf({ answer: "請求未", truth: "請求書。" })).toBeCloseTo(HALF);
  });

  it("treats a character outside the BMP as one character", () => {
    expect(accuracyOf({ answer: "𠮷", truth: "𠮷野" })).toBe(HALF);
  });

  it("does not go below zero for long garbage", () => {
    expect(accuracyOf({ answer: "あいうえおかきくけこ", truth: "山" })).toBe(NONE);
  });

  it("drops lines read in the wrong order", () => {
    expect(accuracyOf({ answer: "かきくあいう", truth: "あいうかきく" })).toBeLessThan(ALL);
  });
});

describe("charF1Of", () => {
  it("ignores the reading order", () => {
    expect(charF1Of({ answer: "かきくあいう", truth: "あいうかきく" })).toBe(ALL);
  });

  it("is zero when nothing matches", () => {
    expect(charF1Of({ answer: "abc", truth: "あいう" })).toBe(NONE);
  });
});
