import type { Paragraph } from "@masseater.dev/yohaku-protocol";
import { Array, String, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { remarksOf } from "./remarks.ts";

const paragraph = (text: string): typeof Paragraph.Type => ({ id: "p", text });

const marked = (text: string): readonly string[] =>
  pipe(
    remarksOf([paragraph(text)]),
    Array.map(({ from, to, message }) => `${message}:${pipe(text, String.slice(from, to))}`),
  );

test("AI の決まり文句は、その語だけを指す", () => {
  expect(marked("静寂が部屋を満たし、ヤチヨは小さく息を吐いた。")).toStrictEqual([
    "AI の決まり文句:静寂",
    "AI の決まり文句:小さく息を吐",
  ]);
});

test("感情の説明は、説明している文を指す", () => {
  expect(
    marked("鏡の中で、かぐやの顔が笑っていた。胸の奥がじんわりと温かくなった。"),
  ).toStrictEqual(["感情の説明:胸の奥がじんわりと温かくなった。"]);
});

test("動作と台詞だけの地の文には何も言わない", () => {
  expect(
    marked("ヤチヨは保管庫の扉を開けた。棚の奥に箱があった。「……これ、まだあったんだ」"),
  ).toStrictEqual([]);
});
