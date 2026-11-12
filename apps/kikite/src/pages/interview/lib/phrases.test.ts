import { describe, expect, it } from "@effect/vitest";
import { String as Str } from "effect";

import { phrased } from "./phrases.ts";

const ZERO_WIDTH_SPACE = 8203;
const BREAK = String.fromCodePoint(ZERO_WIDTH_SPACE);

describe("phrased", () => {
  it("keeps particles with the word before them", () => {
    expect(
      Str.split(BREAK)(phrased("最近いちばん会議が多かった日は、朝から帰宅まで")),
    ).toStrictEqual(["最近いちばん", "会議が", "多かった", "日は、", "朝から", "帰宅まで"]);
  });

  it("starts a phrase at a hiragana word after a particle", () => {
    expect(Str.split(BREAK)(phrased("自分のアプリのことなのかよくわからないんです"))).toStrictEqual(
      ["自分の", "アプリの", "ことなのか", "よくわからないんです"],
    );
  });

  it("keeps a one-letter particle after の and breaks after a comma", () => {
    expect(Str.split(BREAK)(phrased("強く感じたのは、どんな場面でしたか？"))).toStrictEqual([
      "強く",
      "感じたのは、",
      "どんな",
      "場面でしたか？",
    ]);
  });

  it("keeps brackets with the words inside and auxiliaries with the word before", () => {
    expect(Str.split(BREAK)(phrased("気になる「自分のアプリ」は嬉しいものですか？"))).toStrictEqual(
      ["気に", "なる", "「自分の", "アプリ」は", "嬉しいものですか？"],
    );
  });

  it("only adds break opportunities", () => {
    const text = "「モヤモヤ」を最近いちばん強く感じたのは、どんな場面でしたか？";
    expect(Str.replaceAll(BREAK, "")(phrased(text))).toBe(text);
  });
});
