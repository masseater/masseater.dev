import { Effect } from "effect";

import { native } from "#/shared/native/index.ts";
import type { Morpheme } from "#/shared/native/index.ts";

export interface Tokenizer {
  readonly tokenize: (text: string) => readonly Morpheme[];
  readonly tokenizeForSentence: (text: string) => readonly Morpheme[];
}

const CACHE_SIZE = 10_000;

const addon = Effect.cached(native).pipe(Effect.flatten, Effect.runSync);

const cache = new Map<string, readonly Morpheme[]>();

const isMorphemes = (value: unknown): value is readonly Morpheme[] => Array.isArray(value);

const parsed = (json: string): readonly Morpheme[] => {
  const value: unknown = JSON.parse(json);
  if (isMorphemes(value)) {
    return value;
  }
  return [];
};

const remember = (text: string, tokens: readonly Morpheme[]): readonly Morpheme[] => {
  if (cache.size >= CACHE_SIZE) {
    cache.delete(cache.keys().next().value ?? "");
  }
  cache.set(text, tokens);
  return tokens;
};

export const tokenizeSync = (text: string): readonly Morpheme[] =>
  cache.get(text) ?? remember(text, parsed(addon.tokenize(text)));

const tokenizer: Tokenizer = { tokenize: tokenizeSync, tokenizeForSentence: tokenizeSync };

export const getTokenizer = async (): Promise<Tokenizer> => tokenizer;

export const tokenize = async (text: string): Promise<readonly Morpheme[]> => tokenizeSync(text);
