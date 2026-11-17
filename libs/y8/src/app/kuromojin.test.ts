import { Array as Arr, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { getTokenizer, tokenize } from "./kuromojin.ts";

test("tokenize splits Japanese into kuromoji-shaped morphemes", async () => {
  const tokens = await tokenize("すもももももももものうち");
  expect(
    pipe(
      tokens,
      Arr.map((token) => token.surface_form),
    ),
  ).toStrictEqual(["すもも", "も", "もも", "も", "もも", "の", "うち"]);
  expect(tokens[1]).toMatchObject({ pos: "助詞", pos_detail_1: "係助詞", word_position: 4 });
});

test("getTokenizer tokenizes a sentence synchronously", async () => {
  const tokenizer = await getTokenizer();
  expect(tokenizer.tokenizeForSentence("走らない").at(-1)).toMatchObject({
    surface_form: "ない",
    basic_form: "ない",
    conjugated_type: "特殊・ナイ",
  });
});

test("unknown words carry no reading", async () => {
  const [token] = await tokenize("masseater");
  expect(token).toMatchObject({ word_type: "UNKNOWN", basic_form: "*" });
  expect(token?.reading).toBeUndefined();
});
