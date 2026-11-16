import { Array as Arr, pipe } from "effect";

import patterns from "#/entities/song/catalog/life-is-but-a/score/patterns.json";

const NONE = 0;

const SHIFTED = { from: 48, to: 72, by: 2 };
const SECOND = { from: 24, to: 72 };
const CYCLE = 4;

export interface Chord {
  readonly root: number;
  readonly keys: readonly number[];
}

export const keyShiftOf = (bar: number): number => {
  if (bar >= SHIFTED.from && bar < SHIFTED.to) {
    return SHIFTED.by;
  }
  return NONE;
};

const progressionOf = (bar: number): readonly Chord[] => {
  if (bar < SECOND.from || bar >= SECOND.to) {
    return patterns.chords.first;
  }
  return patterns.chords.second;
};

export const chordOf = (bar: number): Chord => {
  const chord = progressionOf(bar)[bar % CYCLE] ?? { root: NONE, keys: [] };
  const shift = keyShiftOf(bar);
  return {
    root: chord.root + shift,
    keys: pipe(
      chord.keys,
      Arr.map((key) => key + shift),
    ),
  };
};
