import { Array as Arr, Option, Schema, pipe } from "effect";

import type { Phoneme } from "./lab.ts";

const Mora = Schema.Struct({
  text: Schema.String,
  consonant: Schema.String.pipe(Schema.NullOr, Schema.optionalKey),
  consonant_length: Schema.Finite.pipe(Schema.NullOr, Schema.optionalKey),
  vowel: Schema.String,
  vowel_length: Schema.Finite,
  pitch: Schema.Finite,
});

const AccentPhrase = Schema.Struct({
  moras: Schema.Array(Mora),
  pause_mora: Mora.pipe(Schema.NullOr, Schema.optionalKey),
  is_interrogative: Schema.optionalKey(Schema.Boolean),
});

export const AudioQuerySchema = Schema.Struct({
  accent_phrases: Schema.Array(AccentPhrase),
  speedScale: Schema.Finite,
  prePhonemeLength: Schema.Finite,
  postPhonemeLength: Schema.Finite,
  pauseLength: Schema.Finite.pipe(Schema.NullOr, Schema.optionalKey),
  pauseLengthScale: Schema.optionalKey(Schema.Finite),
});

export type AudioQuery = typeof AudioQuerySchema.Type;

interface Timed {
  readonly consonant: Option.Option<string>;
  readonly consonantLength: number;
  readonly vowel: string;
  readonly vowelLength: number;
  readonly pitch: number;
}

const ENGINE_FRAMES_PER_SECOND = 93.75;
const UPSPEAK_SECONDS = 0.15;
const HALF = 0.5;
const EVEN = 2;
const NOTHING = 0;
const SAME = 1;

const roundHalfEven = (value: number): number => {
  const floor = Math.floor(value);
  const fraction = value - floor;
  if (fraction > HALF || (fraction === HALF && floor % EVEN !== NOTHING)) {
    return floor + SAME;
  }
  return floor;
};

const framesOf = (seconds: number): number => roundHalfEven(seconds * ENGINE_FRAMES_PER_SECOND);

const timedOf = (mora: typeof Mora.Type): Timed => ({
  consonant: pipe(
    Option.fromNullishOr(mora.consonant),
    Option.filter((consonant) => consonant !== ""),
  ),
  consonantLength: mora.consonant_length ?? NOTHING,
  vowel: mora.vowel,
  vowelLength: mora.vowel_length,
  pitch: mora.pitch,
});

const silence = (seconds: number): Timed => ({
  consonant: Option.none(),
  consonantLength: NOTHING,
  vowel: "sil",
  vowelLength: seconds,
  pitch: NOTHING,
});

const upspeakOf = (phrase: typeof AccentPhrase.Type): readonly Timed[] =>
  pipe(
    Arr.last(phrase.moras),
    Option.filter((last) => phrase.is_interrogative === true && last.pitch > NOTHING),
    Option.map((last) => ({ ...silence(UPSPEAK_SECONDS), vowel: last.vowel, pitch: last.pitch })),
    Option.toArray,
  );

const morasOf = (query: AudioQuery): readonly Timed[] => [
  silence(query.prePhonemeLength),
  ...pipe(
    query.accent_phrases,
    Arr.flatMap((phrase) => [
      ...pipe(phrase.moras, Arr.map(timedOf)),
      ...upspeakOf(phrase),
      ...pipe(Option.fromNullishOr(phrase.pause_mora), Option.map(timedOf), Option.toArray),
    ]),
  ),
  silence(query.postPhonemeLength),
];

const pauseLengthOf = (query: AudioQuery, mora: Timed): number => {
  if (mora.vowel !== "pau") {
    return mora.vowelLength;
  }
  return (query.pauseLength ?? mora.vowelLength) * (query.pauseLengthScale ?? SAME);
};

const scaled =
  (query: AudioQuery) =>
  (mora: Timed): Timed => ({
    ...mora,
    vowelLength: pauseLengthOf(query, mora) / query.speedScale,
    consonantLength: mora.consonantLength / query.speedScale,
  });

interface Span {
  readonly phoneme: string;
  readonly frames: number;
}

const spansOf = (mora: Timed): readonly Span[] => [
  ...pipe(
    mora.consonant,
    Option.map((phoneme) => ({ phoneme, frames: framesOf(mora.consonantLength) })),
    Option.toArray,
  ),
  { phoneme: mora.vowel, frames: framesOf(mora.vowelLength) },
];

const labNameOf = (phoneme: string): string => {
  if (phoneme === "sil") {
    return "pau";
  }
  return phoneme;
};

export const phonemesFromAudioQuery = (query: AudioQuery): readonly Phoneme[] => {
  const spans = pipe(morasOf(query), Arr.map(scaled(query)), Arr.flatMap(spansOf));
  const phonemes: Phoneme[] = [];
  let frame = NOTHING;
  for (const { phoneme, frames } of spans) {
    phonemes.push({
      start: frame / ENGINE_FRAMES_PER_SECOND,
      end: (frame + frames) / ENGINE_FRAMES_PER_SECOND,
      phoneme: labNameOf(phoneme),
    });
    frame += frames;
  }
  return phonemes;
};
