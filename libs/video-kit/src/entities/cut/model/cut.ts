import { Array as Arr, Option, pipe } from "effect";

import type { Format } from "#/shared/config/index.ts";

export type Cut = Readonly<{
  id: string;
  say: readonly string[];
  hold?: number;
  formats?: readonly Format[];
  voice?: number;
}>;

export type Bgm = Readonly<{ url: string; credit: string; page?: string }>;

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

export const voicesOf = (script: VideoScript): readonly number[] =>
  pipe(script.cuts, Arr.map(voiceOf(script)), Arr.prepend(script.voice), Arr.dedupe);
