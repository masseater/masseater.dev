import { Array as Arr, Effect, Option, Schema, pipe } from "effect";

import { native } from "#/shared/native/index.ts";
import type { Morpheme } from "#/shared/native/index.ts";

export interface Tokenizer {
  readonly tokenize: (text: string) => readonly Morpheme[];
  readonly tokenizeForSentence: (text: string) => readonly Morpheme[];
}

const CACHE_SIZE = 10_000;
const NO_MORPHEMES: readonly Morpheme[] = [];

const addon = Effect.cached(native).pipe(Effect.runSync);

const cache = new Map<string, readonly Morpheme[]>();

const decodeJson = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Unknown));

const isMorphemes = (value: unknown): value is readonly Morpheme[] => Arr.isArray(value);

const parsed = (json: string): readonly Morpheme[] =>
  pipe(
    decodeJson(json),
    Option.filter(isMorphemes),
    Option.getOrElse(() => NO_MORPHEMES),
  );

const remember = (text: string, morphemes: readonly Morpheme[]): readonly Morpheme[] => {
  if (cache.size >= CACHE_SIZE) {
    cache.clear();
  }
  cache.set(text, morphemes);
  return morphemes;
};

export const morphemesOf = (text: string): readonly Morpheme[] =>
  pipe(
    Option.fromUndefinedOr(cache.get(text)),
    Option.getOrElse(() => remember(text, parsed(pipe(addon, Effect.runSync).tokenize(text)))),
  );

const tokenizer: Tokenizer = { tokenize: morphemesOf, tokenizeForSentence: morphemesOf };

export const getTokenizer = (): Promise<Tokenizer> => Promise.resolve(tokenizer);

export const tokenize = (text: string): Promise<readonly Morpheme[]> =>
  Promise.resolve(morphemesOf(text));
