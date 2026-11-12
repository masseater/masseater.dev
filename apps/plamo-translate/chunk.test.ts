import { describe, expect, it } from "@effect/vitest";
import { Array as Arr, String as Str } from "effect";

import { split } from "./chunk.ts";

const TIGHT = 5;
const TWO_SHORT = 8;
const LONG = 20;
const LOOSE = 10;

const joined = (text: string, limit: number): string =>
  Arr.join(
    Arr.map(split(limit)(text), (part) => part.text),
    "",
  );

const translated = (text: string, limit: number): readonly string[] =>
  Arr.map(
    Arr.filter(split(limit)(text), (part) => part.translate),
    (part) => part.text,
  );

describe("split", () => {
  it("つなげ直すと元の文に戻る", () => {
    const text = "  first line\nsecond line\n\n \n third\n\nfourth  \n";
    expect(joined(text, TIGHT)).toBe(text);
  });

  it("上限に収まる段落はまとめ、超える分を次の区切りにする", () => {
    expect(translated("aaa\n\nbbb\n\ncccc", TWO_SHORT)).toStrictEqual(["aaa\n\nbbb", "cccc"]);
  });

  it("上限を超える段落も途中では切らない", () => {
    const long = Str.repeat(LONG)("x");
    expect(translated(`${long}\n\nyy`, LOOSE)).toStrictEqual([long, "yy"]);
  });

  it("空白だけの文は訳さない", () => {
    expect([split(LOOSE)(""), split(LOOSE)(" \n ")]).toStrictEqual([
      [],
      [{ text: " \n ", translate: false }],
    ]);
  });
});
