import { Schema, String as Str } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { Keyword, TextSearch } from "./text-search.ts";

const MAX_KEYWORD = 100;

const LONGEST = Str.repeat(MAX_KEYWORD)("あ");

const accepts = Schema.is(TextSearch);

describe("TextSearch", () => {
  it("100 文字までの語は通す", () => {
    expect(accepts({ keyword: LONGEST })).toBe(true);
  });

  it("100 文字を超える語は通さない", () => {
    expect(accepts({ keyword: `${LONGEST}あ` })).toBe(false);
  });

  it("語が無くても通す", () => {
    expect(accepts({})).toBe(true);
  });
});

describe("Keyword", () => {
  it("動画の検索と同じ上限で断る", () => {
    expect(Schema.is(Keyword)(`${LONGEST}あ`)).toBe(false);
  });
});
