import { Array as Arr, Option, String as Str, pipe } from "effect";

import type { Format } from "#/shared/config/index.ts";
import { NOTHING, Timing } from "#/shared/config/index.ts";

export type Cut = Readonly<{
  id: string;
  say: readonly string[];
  at?: readonly number[];
  hold?: number;
  speed?: number | readonly number[];
  formats?: readonly Format[];
  voice?: number;
}>;

export type Bgm = Readonly<{
  url: string;
  credit: string;
  page?: string;
  start?: number;
  loudThrough?: string;
}>;

export type VideoScript = Readonly<{
  title: string;
  formats: readonly Format[];
  length: Readonly<Partial<Record<Format, number>>>;
  voice: number;
  readings: Readonly<Record<string, string>>;
  bgm?: Bgm;
  images?: Readonly<Record<string, string>>;
  cuts: readonly Cut[];
}>;

export const isIn =
  (format: Format) =>
  (cut: Cut): boolean =>
    Option.match(Option.fromNullishOr(cut.formats), {
      onNone: () => true,
      onSome: (formats) => formats.includes(format),
    });

export const voiceOf =
  (script: VideoScript) =>
  (cut: Cut): number =>
    cut.voice ?? script.voice;

export const speedOf =
  (cut: Cut) =>
  (index: number): number => {
    const speed = cut.speed ?? Timing.SPEED_SCALE;
    if (typeof speed === "number") {
      return speed;
    }
    return Option.getOrElse(Arr.get(speed, index), () => Timing.SPEED_SCALE);
  };

export const PART = "|";

export const partsOf = (say: string): readonly string[] => Str.split(PART)(say);

export const unpartedOf = (say: string): string => Str.replaceAll(PART, Str.empty)(say);

const NO_BEATS: readonly number[] = [];

export const lineBeatsOf = (cut: Cut): readonly (readonly number[])[] =>
  pipe(
    cut.say,
    Arr.mapAccum(NOTHING, (taken, say) => {
      const count = partsOf(say).length;
      const beats = pipe(cut.at ?? NO_BEATS, Arr.drop(taken), Arr.take(count));
      return [taken + count, beats];
    }),
    ([, beats]) => beats,
  );

const ONE_PART = 1;

export const relativeBeatsOf =
  (cut: Cut) =>
  (index: number): readonly number[] =>
    pipe(
      Arr.get(lineBeatsOf(cut), index),
      Option.filter((beats) => beats.length > ONE_PART),
      Option.flatMap((beats) =>
        Option.map(Arr.head(beats), (first) =>
          pipe(
            beats,
            Arr.map((beat) => beat - first),
          ),
        ),
      ),
      Option.getOrElse(() => NO_BEATS),
    );

export const voicesOf = (script: VideoScript): readonly number[] =>
  pipe(script.cuts, Arr.map(voiceOf(script)), Arr.prepend(script.voice), Arr.dedupe);
