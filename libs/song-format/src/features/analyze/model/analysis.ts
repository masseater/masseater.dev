import { Array as Arr, Option, Schema, pipe } from "effect";

import type { Song } from "#/entities/song/index.ts";

import { ChordSpanSchema, chordsOf } from "./chords.ts";
import { BarRangeSchema, KeySpanSchema, keyIn } from "./keys.ts";
import type { BarRange } from "./keys.ts";
import { repeatsOf } from "./repeats.ts";

const FIRST = 1;
const NONE = 0;
const PHRASE_BARS = 4;

export const AnalysisSchema = Schema.Struct({
  bars: Schema.Int,
  key: Schema.OptionFromNullOr(KeySpanSchema),
  keys: Schema.Array(KeySpanSchema),
  chords: Schema.Array(ChordSpanSchema),
  repeats: Schema.Array(BarRangeSchema),
});

export type Analysis = typeof AnalysisSchema.Type;

const phrasesOf = (bars: number): readonly BarRange[] =>
  Arr.makeBy(Math.ceil(bars / PHRASE_BARS), (phrase) => ({
    fromBar: phrase * PHRASE_BARS + FIRST,
    toBar: Math.min(bars, (phrase + FIRST) * PHRASE_BARS),
  }));

export const analyze = (song: Song): Analysis => {
  const bars = song.bars.length;
  if (bars === NONE) {
    return { bars, key: Option.none(), keys: [], chords: [], repeats: [] };
  }
  return {
    bars,
    key: keyIn(song)({ fromBar: FIRST, toBar: bars }),
    keys: pipe(phrasesOf(bars), Arr.map(keyIn(song)), Arr.getSomes),
    chords: chordsOf(song),
    repeats: repeatsOf(song),
  };
};
