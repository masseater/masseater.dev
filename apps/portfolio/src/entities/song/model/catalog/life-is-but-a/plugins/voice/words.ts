import { SAMPLE_RATE, orDefault, semitoneRatio } from "@masseater.dev/fumx-studio/dsp/number";
import { fade, resample } from "@masseater.dev/fumx-studio/dsp/sampling";
import { stretch } from "@masseater.dev/fumx-studio/dsp/stretch";
import type { Stretching } from "@masseater.dev/fumx-studio/dsp/stretch";
import { numberIn, textIn } from "@masseater.dev/fumx-studio/plugin/args";
import type { Voice } from "@masseater.dev/fumx-studio/plugin/plugin";
import type { PluginArgument } from "@r_masseater/fumx-parser";
import { Option } from "effect";

const NOTHING = 0;
const ONE = 1;
const SLACK = 0.04;
const GRAIN = { akai: 0.05, smooth: 0.035 };
const FADE = { fadeIn: 3e-3, fadeOut: 0.012 };
const SPOKEN = {
  semitones: -1,
  ratio: 1.25,
  grain: 0.05,
  fade: { fadeIn: 0.01, fadeOut: 0.05 },
};

interface Word {
  readonly from: number;
  readonly to: number;
  readonly root: number;
  readonly key: number;
  readonly seconds: number;
  readonly mode: Option.Option<string>;
  readonly grain: Option.Option<number>;
}

const wordOf = (args: readonly PluginArgument[]): Word => {
  const number = (name: string): number => Option.getOrElse(numberIn(args)(name), () => NOTHING);
  return {
    from: number("from"),
    to: number("to"),
    root: number("root"),
    key: number("key"),
    seconds: number("seconds"),
    mode: textIn(args)("mode"),
    grain: numberIn(args)("grain"),
  };
};

const isAkai = (word: Word): boolean => Option.contains(word.mode, "akai");

const grainOf = (word: Word): number => {
  if (isAkai(word)) {
    return word.grain.pipe(Option.getOrUndefined, orDefault(GRAIN.akai));
  }
  return word.grain.pipe(Option.getOrUndefined, orDefault(GRAIN.smooth));
};

const modeOf = (word: Word): NonNullable<Stretching["mode"]> => {
  if (isAkai(word)) {
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

const sungOf = (word: Word, source: Float32Array): Float32Array =>
  resample({
    rate: semitoneRatio(word.key - word.root),
    offset: word.from * SAMPLE_RATE,
    length: (word.to - word.from) * SAMPLE_RATE,
  })(source);

export const wordIn =
  (args: readonly PluginArgument[]) =>
  (source: Float32Array): Voice => {
    const word = wordOf(args);
    return {
      sound: fade(FADE)(stretched(word, sungOf(word, source))),
      label: Option.getOrElse(textIn(args)("label"), () => ""),
      midi: Option.some(word.key),
    };
  };

export const spokenOf = (source: Float32Array): Float32Array => {
  const said = resample({ rate: semitoneRatio(SPOKEN.semitones) })(source);
  return fade(SPOKEN.fade)(
    new Float32Array(stretch({ ratio: SPOKEN.ratio, grain: SPOKEN.grain, mode: "akai" })(said)),
  );
};
