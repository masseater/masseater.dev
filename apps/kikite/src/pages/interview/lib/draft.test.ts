import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import { parseDraft } from "./draft.ts";

describe("parseDraft", () => {
  it("reads the reason and the question on separate lines", () => {
    expect(
      parseDraft("根拠: 「散らかる」と話していたので聞きます。\n質問: どこに書いていますか？"),
    ).toStrictEqual({
      reason: "「散らかる」と話していたので聞きます。",
      question: "どこに書いていますか？",
      error: Option.none(),
    });
  });

  it("reads full-width colons and both labels on one line", () => {
    const parsed = parseDraft("根拠：「嫌」と話していたので聞きます。 質問：何が嫌ですか？");
    expect([parsed.reason, parsed.question]).toStrictEqual([
      "「嫌」と話していたので聞きます。",
      "何が嫌ですか？",
    ]);
  });

  it("keeps the reason while the question is still streaming", () => {
    expect(parseDraft("根拠: 「週末」と話していたので").question).toBe("");
  });

  it("shows nothing while the first label is still streaming", () => {
    expect(parseDraft("根").question).toBe("");
  });

  it("treats text without labels as the question", () => {
    expect(parseDraft("いつ見返しますか？").question).toBe("いつ見返しますか？");
  });

  it("reads the error the server appends", () => {
    expect(parseDraft("\nエラー: 401 unauthorized").error).toStrictEqual(
      Option.some("401 unauthorized"),
    );
  });
});
