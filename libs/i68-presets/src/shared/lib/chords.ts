import { Array as Arr, Option, pipe } from "effect";
import { Chord } from "tonal";

const COMMON = [
  "M",
  "m",
  "dim",
  "aug",
  "7",
  "maj7",
  "m7",
  "m7b5",
  "dim7",
  "sus4",
  "sus2",
  "6",
  "m6",
  "Madd9",
  "madd9",
  "9",
  "maj9",
  "m9",
  "7sus4",
  "m/ma7",
  "6add9",
  "m69",
  "5",
];
const DYAD = 2;

const isCommonName = (name: string): boolean =>
  pipe(
    Arr.head(Chord.get(name).aliases),
    Option.exists((alias) => Arr.contains(COMMON, alias)),
  );

export const isCommonChord = (pitchClasses: readonly string[]): boolean => {
  const names = Arr.dedupe(pitchClasses);
  if (names.length < DYAD) {
    return true;
  }
  return pipe(Chord.detect(names), Arr.some(isCommonName));
};
