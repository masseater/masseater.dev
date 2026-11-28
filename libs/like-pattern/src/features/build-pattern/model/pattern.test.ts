import { String as Str } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { containingPattern, startingPattern } from "./pattern.ts";

const PATTERN_BYTES = 50;

const utf8 = new TextEncoder();

const bytesOf = (text: string): number => utf8.encode(text).byteLength;

const LONG_CHARACTERS = 100;

const FITTING_KANA = 16;

const ASCII_BEFORE_KANA = 47;

const LONG = Str.repeat(LONG_CHARACTERS)("あ");

describe("containingPattern", () => {
  it("短い語はそのまま両側を % で囲む", () => {
    expect(containingPattern("三体")).toBe("%三体%");
  });

  it("長い語は 50 バイトに収まる先頭部分にする", () => {
    expect(bytesOf(containingPattern(LONG))).toBeLessThanOrEqual(PATTERN_BYTES);
    expect(containingPattern(LONG)).toBe(`%${Str.repeat(FITTING_KANA)("あ")}%`);
  });

  it("文字の途中では切らない", () => {
    expect(containingPattern(`${Str.repeat(ASCII_BEFORE_KANA)("a")}あ`)).toBe(
      `%${Str.repeat(ASCII_BEFORE_KANA)("a")}%`,
    );
  });
});

describe("startingPattern", () => {
  it("語の後ろだけを % にする", () => {
    expect(startingPattern("views/")).toBe("views/%");
  });

  it("長い語は 50 バイトに収まる先頭部分にする", () => {
    expect(bytesOf(startingPattern(LONG))).toBeLessThanOrEqual(PATTERN_BYTES);
  });
});
