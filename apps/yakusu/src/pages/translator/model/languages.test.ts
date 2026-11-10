import { describe, expect, it } from "@effect/vitest";
import { Array, pipe } from "effect";

import { LANGUAGES, languageName } from "./languages.ts";

const MODEL_CARD_LANGUAGES = 53;

const PAIR = 2;

describe("LANGUAGES", () => {
  it("lists the languages of the model card once each", () => {
    const codes = pipe(
      LANGUAGES,
      Array.map(({ code }) => code),
    );
    expect(new Set(codes).size).toBe(MODEL_CARD_LANGUAGES);
    expect(LANGUAGES).toHaveLength(MODEL_CARD_LANGUAGES);
  });

  it("names every language in Japanese", () => {
    expect(languageName("ja")).toBe("日本語");
    expect(languageName("en")).toBe("英語");
    const names = pipe(
      LANGUAGES,
      Array.map(({ name }) => name),
    );
    expect(new Set(names).size).toBe(MODEL_CARD_LANGUAGES);
    expect(
      pipe(
        LANGUAGES,
        Array.filter(({ code, name }) => name === code),
      ),
    ).toStrictEqual([]);
  });

  it("orders kanji names by their reading", () => {
    const names = pipe(
      LANGUAGES,
      Array.map(({ name }) => name),
    );
    const after = (name: string): readonly string[] =>
      pipe(
        names,
        Array.dropWhile((other) => other !== name),
        Array.take(PAIR),
      );
    expect(after("ウルドゥー語")).toStrictEqual(["ウルドゥー語", "英語"]);
    expect(after("ドイツ語")).toStrictEqual(["ドイツ語", "日本語"]);
  });
});
