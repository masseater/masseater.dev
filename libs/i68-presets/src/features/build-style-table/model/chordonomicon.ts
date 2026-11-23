import { Array as Arr, Number as Num, Option, Order, pipe } from "effect";
import { Chord, Note } from "tonal";

import { tokenOf } from "#/shared/lib/degrees.ts";

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

const readable = (symbol: string): boolean => !Chord.get(symbol).empty;

const majorKeys = Arr.makeBy(PITCH_CLASSES, (pitchClass) => ({
  pitchClass,
  mode: "major" as const,
}));

const tokensIn =
  (symbols: readonly string[]) =>
  (key: (typeof majorKeys)[number]): readonly string[] =>
    pipe(symbols, Arr.map(tokenOf(key)), Arr.getSomes);

const fitOf = (tokens: readonly string[]): number =>
  Arr.countBy(tokens, (token) => DIATONIC.has(token));

const firstRootOf = (symbols: readonly string[]): number =>
  pipe(
    Arr.head(symbols),
    Option.flatMap((symbol) => Option.fromNullishOr(Note.chroma(Chord.get(symbol).tonic ?? ""))),
    Option.getOrElse(() => 0),
  );

export const tokensOf = (chords: string): readonly string[] => {
  const symbols = pipe(
    chords.split(" "),
    Arr.filter((word) => word !== "" && !SECTION.test(word)),
    Arr.map(symbolOf),
    Arr.filter(readable),
  );
  const tonic = firstRootOf(symbols);
  const byFit = Order.combine(
    Order.mapInput(Num.Order, (key: (typeof majorKeys)[number]) => -fitOf(tokensIn(symbols)(key))),
    Order.mapInput(Num.Order, (key: (typeof majorKeys)[number]) =>
      key.pitchClass === tonic ? 0 : FIRST,
    ),
  );
  return pipe(
    Arr.head(Arr.sort(majorKeys, byFit)),
    Option.map(tokensIn(symbols)),
    Option.getOrElse((): readonly string[] => []),
    Arr.dedupeAdjacent,
  );
};
