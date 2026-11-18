import { Array as Arr, Predicate } from "effect";

import patterns from "#/entities/song/catalog/life-is-but-a/score/patterns.json";
import { SAMPLE_RATE, orDefault, semitoneRatio } from "#/entities/song/lib/dsp/number.ts";
import { fade, resample } from "#/entities/song/lib/dsp/sampling.ts";
import { stretch } from "#/entities/song/lib/dsp/stretch.ts";
import type { Stretching } from "#/entities/song/lib/dsp/stretch.ts";

import type { Life } from "./context.ts";

const NOTHING = 0;
const ONE = 1;
const DIGITS = 3;
const SLACK = 0.04;
const GRAIN = { akai: 0.05, smooth: 0.035 };
const FADE = { fadeIn: 3e-3, fadeOut: 0.012 };
const SOURCE = "v_f2_row";

export interface Syllable {
  readonly from: number;
  readonly to: number;
  readonly key: number;
}

export interface Word {
  readonly syllable: string | Syllable;
  readonly key: number;
  readonly seconds: number;
  readonly mode?: string;
  readonly grain?: number;
  readonly source?: string;
  readonly label?: string;
}

const WORDS: Readonly<Record<string, Syllable>> = patterns.words;

const syllableOf = (syllable: string | Syllable): Syllable => {
  if (typeof syllable === "string") {
    return WORDS[syllable] ?? { from: NOTHING, to: NOTHING, key: NOTHING };
  }
  return syllable;
};

const syllableNameOf = (syllable: string | Syllable): string => {
  if (typeof syllable === "string") {
    return syllable;
  }
  return `${String(syllable.from)},${String(syllable.to)},${String(syllable.key)}`;
};

const keyOf = (word: Word): string =>
  Arr.join(
    [
      syllableNameOf(word.syllable),
      String(word.key),
      word.seconds.toFixed(DIGITS),
      word.mode ?? "",
      String(word.grain ?? ""),
      word.source ?? "",
    ],
    "|",
  );

const grainOf = (word: Word): number => {
  if (word.mode === "akai") {
    return orDefault(GRAIN.akai)(word.grain);
  }
  return orDefault(GRAIN.smooth)(word.grain);
};

const modeOf = (word: Word): NonNullable<Stretching["mode"]> => {
  if (word.mode === "akai") {
    return "akai";
  }
  return "smooth";
};

const stretched = (word: Word, sung: Float32Array): Float32Array => {
  const ratio = (word.seconds * SAMPLE_RATE) / sung.length;
  if (Math.abs(ratio - ONE) <= SLACK) {
    return sung;
  }
  return new Float32Array(stretch({ ratio, grain: grainOf(word), mode: modeOf(word) })(sung));
};

const labelOf = (word: Word): string => {
  if (Predicate.isNotUndefined(word.label) && word.label !== "") {
    return word.label;
  }
  if (typeof word.syllable === "string") {
    return word.syllable;
  }
  return word.source ?? "";
};

const sungOf = (life: Life, word: Word): Float32Array => {
  const syllable = syllableOf(word.syllable);
  const source = life.samples[word.source ?? SOURCE] ?? new Float32Array();
  return resample({
    rate: semitoneRatio(word.key - syllable.key),
    offset: syllable.from * SAMPLE_RATE,
    length: (syllable.to - syllable.from) * SAMPLE_RATE,
  })(source);
};

export const wordOf =
  (life: Life) =>
  (word: Word): Float32Array => {
    const key = keyOf(word);
    return life.words.getOrInsertComputed(key, () => {
      const shaped = fade(FADE)(stretched(word, sungOf(life, word)));
      life.labelled(shaped, { name: labelOf(word), midi: word.key });
      return shaped;
    });
  };
