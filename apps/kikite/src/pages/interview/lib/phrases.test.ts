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

  it("only adds break opportunities", () => {
    const text = "「モヤモヤ」を最近いちばん強く感じたのは、どんな場面でしたか？";
    expect(Str.replaceAll(BREAK, "")(phrased(text))).toBe(text);
  });
});
