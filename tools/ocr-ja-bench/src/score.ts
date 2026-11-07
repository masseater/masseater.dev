import { Record as Rec, Array as Arr, String as Str, pipe } from "effect";
import { distance } from "fastest-levenshtein";

const PERFECT = 1;

const NOTHING = 0;

const HARMONIC = 2;

const BMP_PRIVATE_USE = 57_344;

interface Pair {
  readonly answer: string;
  readonly truth: string;
}

type Counts = Readonly<Record<string, number>>;

const charactersOf = (text: string): readonly string[] =>
  Array.from(
    pipe(text, Str.normalize("NFKC"), Str.replaceAll(/\s/gu, ""), Str.matchAll(/./gsu)),
    ([character]) => character,
  );

const codesFor = (characters: readonly string[]): Readonly<Record<string, string>> =>
  Rec.fromEntries(
    pipe(
      [...new Set(characters)],
      Arr.map((character, index) => [character, String.fromCodePoint(BMP_PRIVATE_USE + index)]),
    ),
  );

const accuracyOf = ({ answer, truth }: Pair): number => {
  const expected = charactersOf(truth);
  if (expected.length === NOTHING) {
    return PERFECT;
  }
  const actual = charactersOf(answer);
  const codes = codesFor([...expected, ...actual]);
  const encode = (characters: readonly string[]): string =>
    pipe(
      characters,
      Arr.map((character) => codes[character] ?? ""),
      Arr.join(""),
    );
  const errors = distance(encode(expected), encode(actual));
  return Math.max(NOTHING, PERFECT - errors / expected.length);
};

const countsOf = (characters: readonly string[]): Counts => {
  const counts: Record<string, number> = {};
  for (const character of characters) {
    counts[character] = (counts[character] ?? NOTHING) + PERFECT;
  }
  return counts;
};

const overlapOf = (actual: Counts, expected: Counts): number => {
  let matched = NOTHING;
  for (const [character, count] of Rec.toEntries(actual)) {
    matched += Math.min(count, expected[character] ?? NOTHING);
  }
  return matched;
};

const charF1Of = ({ answer, truth }: Pair): number => {
  const expected = charactersOf(truth);
  const actual = charactersOf(answer);
  const matched = overlapOf(countsOf(actual), countsOf(expected));
  if (matched === NOTHING) {
    return NOTHING;
  }
  const precision = matched / actual.length;
  const recall = matched / expected.length;
  return (HARMONIC * precision * recall) / (precision + recall);
};

export { accuracyOf, charF1Of };
export type { Pair };
