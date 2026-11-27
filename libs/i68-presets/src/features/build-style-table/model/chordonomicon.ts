import {
  Array as Arr,
  Boolean as Bool,
  Number as Num,
  Option,
  Order,
  Record as Rec,
  String as Str,
  pipe,
} from "effect";
import { Chord, Note } from "tonal";

import { chordOf, degreeOf } from "#/shared/lib/degrees.ts";
import type { ReadChord } from "#/shared/lib/degrees.ts";

const PITCH_CLASSES = 12;
const DEFAULT_TONIC = 0;
const SECTION = /^<[^>]+>$/u;
const SPELLING = /^(?<root>[A-G])(?<accidental>s|b)?(?<rest>[^/]*)/u;
const ACCIDENTALS: Readonly<Record<string, string>> = Rec.fromEntries([
  ["s", "#"],
  ["b", "b"],
]);
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

const spelled = (groups: Readonly<Record<string, string | undefined>>): string => {
  const group = (name: string): string =>
    pipe(
      Option.fromNullishOr(groups[name]),
      Option.getOrElse(() => ""),
    );
  const accidental = pipe(
    Rec.get(ACCIDENTALS, group("accidental")),
    Option.getOrElse(() => ""),
  );
  const rest = pipe(group("rest"), Str.replace(/^min/u, "m"));
  return `${group("root")}${accidental}${rest}`;
};

export const symbolOf = (symbol: string): string =>
  pipe(
    Option.fromNullishOr(SPELLING.exec(symbol)),
    Option.flatMap((match) => Option.fromNullishOr(match.groups)),
    Option.match({ onNone: () => symbol, onSome: spelled }),
  );

interface Reading {
  readonly root: Option.Option<number>;
  readonly chord: Option.Option<ReadChord>;
}

const readOnce = (symbol: string): Option.Option<Reading> =>
  pipe(
    Chord.get(symbol),
    Option.liftPredicate((chord) => !chord.empty),
    Option.map((chord) => ({
      root: Option.fromNullishOr(Note.chroma(chord.tonic ?? "")),
      chord: chordOf(symbol),
    })),
  );

const readings = new Map<string, Option.Option<Reading>>();

const read = (symbol: string): Option.Option<Reading> =>
  readings.getOrInsertComputed(symbol, readOnce);

interface MajorKey {
  readonly pitchClass: number;
  readonly mode: "major";
}

interface Fit {
  readonly key: MajorKey;
  readonly tokens: readonly string[];
}

const majorKeys: readonly MajorKey[] = Arr.makeBy(PITCH_CLASSES, (pitchClass) => ({
  pitchClass,
  mode: "major",
}));

const tokensIn =
  (chords: readonly ReadChord[]) =>
  (key: MajorKey): readonly string[] =>
    pipe(chords, Arr.map(degreeOf(key)), Arr.getSomes);

const fitOf = (tokens: readonly string[]): number =>
  Arr.countBy(tokens, (token) => DIATONIC.has(token));

export const tokensOf = (chords: string): readonly string[] => {
  const symbols = pipe(
    chords,
    Str.split(" "),
    Arr.filter((word) => word !== "" && !SECTION.test(word)),
    Arr.map((word) => read(symbolOf(word))),
    Arr.getSomes,
  );
  const tonic = pipe(
    Arr.head(symbols),
    Option.flatMap((reading) => reading.root),
    Option.getOrElse(() => DEFAULT_TONIC),
  );
  const known = pipe(
    symbols,
    Arr.map((reading) => reading.chord),
    Arr.getSomes,
  );
  const fits = pipe(
    majorKeys,
    Arr.map((key): Fit => ({ key, tokens: tokensIn(known)(key) })),
  );
  const byFit = Order.combine(
    Order.mapInput(Num.Order, (fit: Fit) => -fitOf(fit.tokens)),
    Order.mapInput(Bool.Order, (fit: Fit) => fit.key.pitchClass !== tonic),
  );
  return pipe(
    Arr.head(Arr.sort(fits, byFit)),
    Option.map((fit) => fit.tokens),
    Option.getOrElse((): readonly string[] => []),
    Arr.dedupeAdjacent,
  );
};
