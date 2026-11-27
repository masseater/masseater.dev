import { Array as Arr, Option, String as Str, pipe } from "effect";

import { phonemeAt } from "#/entities/phonemes/index.ts";
import type { Phoneme, PhonemePosition } from "#/entities/phonemes/index.ts";
import { bandLevels } from "#/features/move-mouth/lib/band-level.ts";
import { silentMouth } from "#/features/move-mouth/lib/silent.ts";

import type { Speech } from "./speech.ts";

export type ConsonantMode = "close" | "hold" | "blend" | "articulate";

export type MouthShape = "a" | "i" | "u" | "e" | "o" | "n";

type Shape = MouthShape;

export interface VowelMouth {
  readonly kind: "vowel-mouth";
  readonly vowelA: string;
  readonly vowelI: string;
  readonly vowelU: string;
  readonly vowelE: string;
  readonly vowelO: string;
  readonly closed: string;
  readonly consonant?: ConsonantMode;
  readonly alwaysApply?: boolean;
}

const VOWELS: ReadonlyMap<string, Shape> = new Map([
  ["a", "a"],
  ["i", "i"],
  ["u", "u"],
  ["e", "e"],
  ["o", "o"],
]);
const CLOSING = new Set(["pau", "N", "cl"]);
const BILABIAL = new Set(["pau", "N", "m", "p", "b", "v"]);
const ARTICULATION: ReadonlyMap<string, Shape> = new Map([
  ...VOWELS,
  ["m", "n"],
  ["p", "n"],
  ["b", "n"],
  ["f", "u"],
  ["v", "u"],
  ["t", "u"],
  ["d", "u"],
  ["n", "u"],
  ["s", "i"],
  ["z", "i"],
  ["r", "u"],
  ["sh", "i"],
  ["j", "i"],
  ["ch", "i"],
  ["ts", "u"],
  ["y", "i"],
  ["hy", "i"],
  ["ny", "i"],
  ["ky", "i"],
  ["gy", "i"],
  ["by", "i"],
  ["py", "i"],
  ["my", "i"],
  ["ry", "i"],
  ["k", "u"],
  ["g", "u"],
  ["w", "u"],
  ["h", "u"],
  ["N", "n"],
  ["cl", "n"],
  ["pau", "n"],
  ["sil", "n"],
]);
const FALLBACK_LOW_CUT = 100;
const FALLBACK_HIGH_CUT = 1000;
const FALLBACK_THRESHOLD = 20;
const HALF = 0.5;
const STEP = 1;

const vowelOf = (phoneme: string): Option.Option<Shape> =>
  Option.fromNullishOr(VOWELS.get(Str.toLowerCase(phoneme)));

const holdShape = (phonemes: readonly Phoneme[], index: number): Shape => {
  const earlier = pipe(phonemes, Arr.take(index + STEP), Arr.reverse);
  return pipe(
    earlier,
    Arr.findFirst(({ phoneme }) => VOWELS.has(phoneme) || CLOSING.has(phoneme)),
    Option.flatMap(({ phoneme }) => vowelOf(phoneme)),
    Option.getOrElse((): Shape => "n"),
  );
};

const narrowed = (phoneme: string): Shape => {
  const vowel = vowelOf(phoneme);
  if (Option.contains(vowel, "a")) {
    return "o";
  }
  if (Option.contains(vowel, "i")) {
    return "i";
  }
  return "u";
};

const adjacent = (position: PhonemePosition, offset: number): Option.Option<Phoneme> =>
  pipe(
    Arr.get(position.phonemes, position.index + offset),
    Option.filter(
      ({ phoneme, start, end }) =>
        Option.isSome(vowelOf(phoneme)) &&
        (end === position.phoneme.start || start === position.phoneme.end),
    ),
  );

const blendShape = (position: PhonemePosition): Shape => {
  const current = position.phoneme.phoneme;
  const firstHalf = position.progress < HALF;
  if (BILABIAL.has(current)) {
    return "n";
  }
  if (current === "cl" && !firstHalf) {
    return "u";
  }
  if (current === "cl") {
    return pipe(
      adjacent(position, -STEP),
      Option.flatMap(({ phoneme }) => vowelOf(phoneme)),
      Option.getOrElse((): Shape => "n"),
    );
  }
  const offset = Number(!firstHalf) * (STEP + STEP) - STEP;
  return pipe(
    adjacent(position, offset),
    Option.map(({ phoneme }) => narrowed(phoneme)),
    Option.getOrElse((): Shape => "n"),
  );
};

const shapeOf = (mode: ConsonantMode, position: PhonemePosition): Shape => {
  const current = position.phoneme.phoneme;
  if (Option.isSome(vowelOf(current))) {
    return Option.getOrElse(vowelOf(current), (): Shape => "n");
  }
  if (mode === "hold") {
    return holdShape(position.phonemes, position.index);
  }
  if (mode === "blend") {
    return blendShape(position);
  }
  if (mode === "articulate") {
    return Option.getOrElse(Option.fromNullishOr(ARTICULATION.get(current)), (): Shape => "e");
  }
  return "n";
};

const fallbackShape = (speech: Speech): Shape =>
  pipe(
    speech.audio,
    Option.flatMap((audio) =>
      Arr.get(
        bandLevels({
          audio,
          fps: speech.fps,
          lowCut: FALLBACK_LOW_CUT,
          highCut: FALLBACK_HIGH_CUT,
        }),
        speech.frame,
      ),
    ),
    Option.filter((level) => level >= FALLBACK_THRESHOLD),
    Option.map((): Shape => "a"),
    Option.getOrElse((): Shape => "n"),
  );

const patternOf = (mouth: VowelMouth, shape: Shape): string => {
  const patterns = new Map<Shape, string>([
    ["a", mouth.vowelA],
    ["i", mouth.vowelI],
    ["u", mouth.vowelU],
    ["e", mouth.vowelE],
    ["o", mouth.vowelO],
    ["n", mouth.closed],
  ]);
  return patterns.get(shape) ?? mouth.closed;
};

export const vowelMouthState = ({
  mouth,
  speech,
}: Readonly<{ mouth: VowelMouth; speech: Option.Option<Speech> }>): string => {
  if (Option.isNone(speech)) {
    return silentMouth(mouth);
  }
  const position = phonemeAt({
    phonemes: speech.value.phonemes,
    time: speech.value.frame / speech.value.fps,
  });
  const shape = Option.match(position, {
    onNone: () => fallbackShape(speech.value),
    onSome: (found) => shapeOf(mouth.consonant ?? "close", found),
  });
  return patternOf(mouth, shape);
};
