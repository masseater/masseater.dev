import { Array as Arr, Effect, Option, pipe } from "effect";
import { expect, it } from "vite-plus/test";

import { getTokenizer, tokenize } from "./kuromojin.ts";

const SAMPLE = "すもももももももものうち";
const SECOND = 1;

it("tokenize splits Japanese into kuromoji-shaped morphemes", () =>
  Effect.runPromise(
    Effect.map(
      Effect.promise(() => tokenize(SAMPLE)),
      (tokens) => {
        expect(
          pipe(
            tokens,
            Arr.map((token) => token.surface_form),
          ),
        ).toStrictEqual(["すもも", "も", "もも", "も", "もも", "の", "うち"]);
        expect(Arr.get(tokens, SECOND)).toStrictEqual(
          Option.some(
            expect.objectContaining({ pos: "助詞", pos_detail_1: "係助詞", word_position: 4 }),
          ),
        );
      },
    ),
  ));

it("getTokenizer tokenizes a sentence synchronously", () =>
  Effect.runPromise(
    Effect.map(
      Effect.promise(() => getTokenizer()),
      (tokenizer) => {
        expect(Arr.last(tokenizer.tokenizeForSentence("走らない"))).toStrictEqual(
          Option.some(
            expect.objectContaining({
              surface_form: "ない",
              basic_form: "ない",
              conjugated_type: "特殊・ナイ",
            }),
          ),
        );
      },
    ),
  ));

it("unknown words carry no reading", () =>
  Effect.runPromise(
    Effect.map(
      Effect.promise(() => tokenize("masseater")),
      (tokens) => {
        const first = pipe(Arr.head(tokens), Option.getOrThrow);
        expect(first).toMatchObject({ word_type: "UNKNOWN", basic_form: "*" });
        expect("reading" in first).toBe(false);
      },
    ),
  ));
