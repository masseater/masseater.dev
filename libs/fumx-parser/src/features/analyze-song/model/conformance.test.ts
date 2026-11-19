import { Array as Arr, Option, pipe } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { songOf } from "./analysis.test.support.ts";
import type { BarSpec } from "./analysis.test.support.ts";
import { analyze } from "./analysis.ts";

const symbolsOf = (bars: readonly BarSpec[]): readonly string[] =>
  pipe(
    analyze(songOf(bars)).chords,
    Arr.map((chord) => chord.symbol),
  );

const keyOf = (bars: readonly BarSpec[]): string =>
  pipe(
    analyze(songOf(bars)).key,
    Option.map((found) => `${found.tonic} ${found.mode}`),
    Option.getOrElse(() => "none"),
  );

const CHORDS: readonly (readonly [string, BarSpec, string])[] = [
  ["a major triad", { bass: "C2", keys: "E3 G3" }, "CM"],
  ["a major triad in first inversion", { bass: "E2", keys: "G3 C4" }, "CM/E"],
  ["a major triad in second inversion", { bass: "G2", keys: "C4 E4" }, "CM/G"],
  ["a minor triad", { bass: "A2", keys: "C3 E3" }, "Am"],
  ["a diminished triad", { bass: "B2", keys: "D3 F3" }, "Bdim"],
  ["an augmented triad", { bass: "C3", keys: "E3 G#3" }, "Caug"],
  [
    "C, E and A flat, an augmented triad on A flat over C",
    { bass: "C3", keys: "E3 Ab3" },
    "Abaug/C",
  ],
  ["a chord with one pitch class in two octaves", { bass: "C2", keys: "C3 E3 G3 C4" }, "CM"],
  ["a suspended fourth", { bass: "C3", keys: "F3 G3" }, "Csus4"],
  ["a dominant seventh", { bass: "G2", keys: "B2 D3 F3" }, "G7"],
  ["a major seventh", { bass: "F2", keys: "A2 C3 E3" }, "Fmaj7"],
  ["a minor seventh over its root", { bass: "A2", keys: "C3 E3 G3" }, "Am7"],
  ["the same notes over C, a sixth chord", { bass: "C3", keys: "E3 G3 A3" }, "C6"],
  ["a half-diminished seventh", { bass: "B2", keys: "D3 F3 A3" }, "Bm7b5"],
  ["a dominant seventh with a flat ninth", { bass: "G2", keys: "B2 D3 F3 Ab3" }, "G7b9"],
  ["a secondary dominant with a sharp", { bass: "D2", keys: "F#3 A3 C4" }, "D7"],
];

describe("chord names", () => {
  it.each(CHORDS)("names %s", (_name, bar, symbol) => {
    expect(symbolsOf([bar])).toStrictEqual([symbol]);
  });
});

const KEYS: readonly (readonly [string, readonly BarSpec[], string])[] = [
  [
    "I IV V I in G major",
    [
      { bass: "G2", keys: "B3 D4 G4" },
      { bass: "C3", keys: "C4 E4 G4" },
      { bass: "D3", keys: "A3 D4 F#4" },
      { bass: "G2", keys: "B3 D4 G4" },
    ],
    "G major",
  ],
  [
    "I IV V I in F major",
    [
      { bass: "F2", keys: "A3 C4 F4" },
      { bass: "Bb2", keys: "Bb3 D4 F4" },
      { bass: "C3", keys: "G3 C4 E4" },
      { bass: "F2", keys: "A3 C4 F4" },
    ],
    "F major",
  ],
  [
    "i iv V i in A minor with the raised seventh",
    [
      { bass: "A2", keys: "C4 E4 A4" },
      { bass: "D3", keys: "D4 F4 A4" },
      { bass: "E3", keys: "B3 E4 G#4" },
      { bass: "A2", keys: "C4 E4 A4" },
    ],
    "A minor",
  ],
  [
    "i VI VII i in D minor",
    [
      { bass: "D3", keys: "D4 F4 A4" },
      { bass: "Bb2", keys: "Bb3 D4 F4" },
      { bass: "C3", keys: "C4 E4 G4" },
      { bass: "D3", keys: "D4 F4 A4" },
    ],
    "D minor",
  ],
];

describe("keys", () => {
  it.each(KEYS)("reads %s", (_name, bars, key) => {
    expect(keyOf(bars)).toBe(key);
  });
});
