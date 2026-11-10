import { describe, expect, it } from "@effect/vitest";
import { Array, Order, pipe } from "effect";

import { LANGUAGES } from "./languages.ts";
import { matching } from "./search.ts";

const codesFor = (query: string): readonly string[] =>
  pipe(
    matching({ languages: LANGUAGES, query }),
    Array.map(({ code }) => code),
    Array.sortBy(Order.String),
  );

describe("matching", () => {
  it("finds languages by their Japanese name", () => {
    expect(codesFor("ドイツ")).toStrictEqual(["de"]);
  });

  it("finds languages by their code", () => {
    expect(codesFor(" ZH")).toStrictEqual(["zh-hans", "zh-hant"]);
  });

  it("lists every language for an empty query", () => {
    expect(matching({ languages: LANGUAGES, query: "" })).toBe(LANGUAGES);
  });
});
