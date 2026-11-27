import { Option } from "effect";

import type { Format } from "#/shared/config/index.ts";

export type Cut = Readonly<{
  id: string;
  say: readonly string[];
  hold?: number;
  formats?: readonly Format[];
}>;

export type Bgm = Readonly<{ url: string; credit: string }>;

export type VideoScript = Readonly<{
  title: string;
  formats: readonly Format[];
  length: Readonly<Partial<Record<Format, number>>>;
  voice: number;
  readings: Readonly<Record<string, string>>;
  bgm?: Bgm;
  cuts: readonly Cut[];
}>;

export const isIn =
  (format: Format) =>
  (cut: Cut): boolean =>
    Option.match(Option.fromNullishOr(cut.formats), {
      onNone: () => true,
      onSome: (formats) => formats.includes(format),
    });
