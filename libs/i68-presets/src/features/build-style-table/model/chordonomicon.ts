import { Array as Arr, Number as Num, Option, Order, pipe } from "effect";
import { Chord, Note } from "tonal";

import { chordOf, degreeOf } from "#/shared/lib/degrees.ts";
import type { ReadChord } from "#/shared/lib/degrees.ts";

const PITCH_CLASSES = 12;
const FIRST = 1;
const SECTION = /^<[^>]+>$/u;
const SPELLING = /^(?<root>[A-G])(?<accidental>s|b)?(?<rest>[^/]*)/u;
const DIATONIC: ReadonlySet<string> = new Set([
  "I",
  "IM7",
  "IIm",
  "IIm7",
  "IIIm",
  "IIIm7",
  "IV",
  "IVM7",
  "V",
  "V7",
  "VIm",
  "VIm7",
  "VIIdim",
  "VIIm7b5",
]);

export const symbolOf = (symbol: string): string => {
  const parts = SPELLING.exec(symbol)?.groups;
  if (parts === undefined) {
    return symbol;
  }
  const accidental = parts["accidental"] === "s" ? "#" : (parts["accidental"] ?? "");
  const rest = (parts["rest"] ?? "").replace(/^min/u, "m");
  return `${parts["root"] ?? ""}${accidental}${rest}`;
};

interface Reading {
  readonly root: Option.Option<number>;
  readonly chord: Option.Option<ReadChord>;
}

const readings = new Map<string, Option.Option<Reading>>();

const read = (symbol: string): Option.Option<Reading> => {
  const known = readings.get(symbol);
  if (known !== undefined) {
    return known;
  }
  const chord = Chord.get(symbol);
  const reading = chord.empty
    ? Option.none()
    : Option.some({
        root: Option.fromNullishOr(Note.chroma(chord.tonic ?? "")),
        chord: chordOf(symbol),
      });
  readings.set(symbol, reading);
  return reading;
};

const majorKeys = Arr.makeBy(PITCH_CLASSES, (pitchClass) => ({
  pitchClass,
  mode: "major" as const,
}));

const tokensIn =
  (chords: readonly ReadChord[]) =>
  (key: (typeof majorKeys)[number]): readonly string[] =>
    pipe(chords, Arr.map(degreeOf(key)), Arr.getSomes);

const fitOf = (tokens: readonly string[]): number =>
  Arr.countBy(tokens, (token) => DIATONIC.has(token));

export const tokensOf = (chords: string): readonly string[] => {
  const symbols = pipe(
    chords.split(" "),
    Arr.filter((word) => word !== "" && !SECTION.test(word)),
    Arr.map((word) => read(symbolOf(word))),
    Arr.getSomes,
  );
  const tonic = pipe(
    Arr.head(symbols),
    Option.flatMap((reading) => reading.root),
    Option.getOrElse(() => 0),
  );
  const known = pipe(
    symbols,
    Arr.map((reading) => reading.chord),
    Arr.getSomes,
  );
  const fits = Arr.map(majorKeys, (key) => ({ key, tokens: tokensIn(known)(key) }));
  const byFit = Order.combine(
    Order.mapInput(Num.Order, (fit: (typeof fits)[number]) => -fitOf(fit.tokens)),
    Order.mapInput(Num.Order, (fit: (typeof fits)[number]) =>
      fit.key.pitchClass === tonic ? 0 : FIRST,
    ),
  );
  return pipe(
    Arr.head(Arr.sort(fits, byFit)),
    Option.map((fit) => fit.tokens),
    Option.getOrElse((): readonly string[] => []),
    Arr.dedupeAdjacent,
  );
};
