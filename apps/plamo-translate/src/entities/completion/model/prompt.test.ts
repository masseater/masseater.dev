import { describe, expect, it } from "@effect/vitest";
import { TranslateRequest } from "@masseater.dev/plamo-translate-protocol";
import { Array as Arr, Option, Result, Schema } from "effect";

import { promptOf } from "./prompt.ts";

const decode = Schema.decodeUnknownResult(TranslateRequest);

describe("promptOf", () => {
  it("元の言語が無ければ、モデルカードと同じ形で訳す先だけを書く", () => {
    expect(
      promptOf({
        direction: { to: "en" },
        previous: Option.none(),
        text: "会議は来週の月曜日に変更されました。",
      }),
    ).toBe(
      "<|plamo:tag|>dataset<|plamo:msg|>translation" +
        "<|plamo:tag|>input<|plamo:msg|>会議は来週の月曜日に変更されました。" +
        "<|plamo:tag|>output<|plamo:key|>lang<|plamo:val|>en<|plamo:msg|>",
    );
  });

  it("前の区切りとその訳を先に並べる", () => {
    expect(
      promptOf({
        direction: { from: "ja", to: "en" },
        previous: Option.some({
          source: "プロジェクトの管理画面を開きます。",
          translation: "Open the project dashboard.",
        }),
        text: "オーナーでフィルタリングすることもできます。",
      }),
    ).toBe(
      "<|plamo:tag|>dataset<|plamo:msg|>translation" +
        "<|plamo:tag|>input<|plamo:key|>lang<|plamo:val|>ja<|plamo:msg|>プロジェクトの管理画面を開きます。" +
        "<|plamo:tag|>output<|plamo:key|>lang<|plamo:val|>en<|plamo:msg|>Open the project dashboard." +
        "<|plamo:tag|>input<|plamo:key|>lang<|plamo:val|>ja<|plamo:msg|>オーナーでフィルタリングすることもできます。" +
        "<|plamo:tag|>output<|plamo:key|>lang<|plamo:val|>en<|plamo:msg|>",
    );
  });

  it("文体は訳す先の言語の後に書く", () => {
    expect(
      promptOf({ direction: { to: "ja", form: "polite" }, previous: Option.none(), text: "Hi." }),
    ).toBe(
      "<|plamo:tag|>dataset<|plamo:msg|>translation<|plamo:tag|>input<|plamo:msg|>Hi." +
        "<|plamo:tag|>output<|plamo:key|>lang<|plamo:val|>ja<|plamo:key|>form<|plamo:val|>polite<|plamo:msg|>",
    );
  });
});

describe("TranslateRequest", () => {
  it("モデルカードに並ぶ言語コードを通す", () => {
    expect(
      Arr.map(["ja", "en", "zh-hans", "zh-hant", "ceb", "ja(easy)"], (to) =>
        Result.isSuccess(decode({ text: "x", to })),
      ),
    ).toStrictEqual([true, true, true, true, true, true]);
  });

  it("書式に合わない言語コードを落とす", () => {
    expect(
      Arr.map(["", "EN", "en-US", "zh-han", "e", "english", "zh-hans-x"], (to) =>
        Result.isSuccess(decode({ text: "x", to })),
      ),
    ).toStrictEqual([false, false, false, false, false, false, false]);
  });

  it("予約されたトークンを含む文と、日本語以外への文体の指定を落とす", () => {
    expect([
      Result.isSuccess(decode({ text: "a <|plamo:tag|> b", to: "ja" })),
      Result.isSuccess(decode({ text: "やあ。", to: "en", form: "plain" })),
      Result.isSuccess(decode({ text: "Hi.", to: "ja", form: "plain" })),
    ]).toStrictEqual([false, false, true]);
  });
});
