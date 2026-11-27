import type { Song } from "@r_masseater/fumx-parser";
import { chordsOf } from "@r_masseater/fumx-parser/analysis";
import type { ChordSpan, KeySpan, Sounding } from "@r_masseater/fumx-parser/analysis";
import { Array as Arr, Option, Record as Rec, pipe } from "effect";
import { Chord, Note } from "tonal";

import { keyAt, keysOf } from "./keys.ts";
import { pitchClassOf } from "./pitch.ts";
import { isPitched, sortByStart } from "./voices.ts";

const DEGREES = {
  first: "I",
  flatSecond: "bII",
  second: "II",
  flatThird: "bIII",
  third: "III",
  fourth: "IV",
  raisedFourth: "#IV",
  fifth: "V",
  flatSixth: "bVI",
  sixth: "VI",
  flatSeventh: "bVII",
  seventh: "VII",
};
const DEGREE_NAMES = Rec.values(DEGREES);

const SEVENTHS: Readonly<Record<string, string>> = {
  "dominant seventh": "7",
  "major seventh": "M7",
  "minor seventh": "m7",
  "half-diminished": "m7b5",
  "diminished seventh": "dim7",
};

const TRIADS: Readonly<Record<string, string>> = {
  Major: "",
  Minor: "m",
  Diminished: "dim",
  Augmented: "aug",
};

const RELATIVE_MAJOR = 3;
const FIRST = 1;

export interface Step {
  readonly token: string;
  readonly bar: number;
  readonly line: number;
  readonly column: number;
}

const kindOf = (type: string, quality: string): Option.Option<string> =>
  pipe(
    Rec.get(SEVENTHS, type),
    Option.orElse(() => Rec.get(TRIADS, quality)),
  );

const majorTonicOf = (key: Pick<KeySpan, "mode" | "pitchClass">): number => {
  if (key.mode === "minor") {
    return key.pitchClass + RELATIVE_MAJOR;
  }
  return key.pitchClass;
};

export interface ReadChord {
  readonly chroma: number;
  readonly kind: string;
}

export const chordOf = (symbol: string): Option.Option<ReadChord> => {
  const chord = Chord.get(symbol);
  return Option.flatMap(Option.fromNullishOr(Note.chroma(chord.tonic ?? "")), (chroma) =>
    Option.map(kindOf(chord.type, chord.quality), (kind) => ({ chroma, kind })),
  );
};

export const degreeOf =
  (key: Pick<KeySpan, "mode" | "pitchClass">) =>
  (chord: ReadChord): Option.Option<string> => {
    const pitchClass = pitchClassOf(chord.chroma - majorTonicOf(key));
    return pipe(
      Arr.get(DEGREE_NAMES, pitchClass),
      Option.map((degree) => `${degree}${chord.kind}`),
    );
  };

export const tokenOf =
  (key: Pick<KeySpan, "mode" | "pitchClass">) =>
  (symbol: string): Option.Option<string> =>
    Option.flatMap(chordOf(symbol), degreeOf(key));

const placeOf =
  (soundings: readonly Sounding[]) =>
  (tick: number): Option.Option<Sounding> =>
    pipe(
      soundings,
      Arr.findFirst((sounding) => sounding.start >= tick),
    );

const stepOf =
  (keys: readonly KeySpan[], place: (tick: number) => Option.Option<Sounding>) =>
  (span: ChordSpan): Option.Option<Step> =>
    pipe(
      keyAt(keys)(span.from.bar),
      Option.flatMap((key) => tokenOf(key)(span.symbol)),
      Option.flatMap((token) =>
        Option.map(place(span.start), (sounding) => ({
          token,
          bar: span.from.bar,
          line: sounding.line,
          column: sounding.column,
        })),
      ),
    );

const isNewChord = (step: Step, index: number, steps: readonly Step[]): boolean =>
  !pipe(
    Arr.get(steps, index - FIRST),
    Option.exists((previous) => previous.token === step.token),
  );

export const progressionOf =
  (soundings: readonly Sounding[]) =>
  (song: Song): readonly Step[] => {
    const pitched = pipe(soundings, Arr.filter(isPitched));
    const step = stepOf(keysOf(song), placeOf(sortByStart(pitched)));
    const steps = pipe(chordsOf(song), Arr.map(step), Arr.getSomes);
    return pipe(
      steps,
      Arr.filter((each, index) => isNewChord(each, index, steps)),
    );
  };
