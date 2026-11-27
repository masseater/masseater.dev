import type { Part } from "@masseater.dev/tachie";
import type { Tachie } from "@masseater.dev/video-kit/script";
import { Array as Arr, Option, pipe } from "effect";

import type { TachieEntry } from "./manifest-schema.ts";

interface Patterns {
  readonly closed: string;
  readonly half?: string;
  readonly open: string;
}

const optional = <Value>(value: Value | undefined): readonly Value[] =>
  Option.toArray(Option.fromNullishOr(value));

const blinkOf = (blink: Patterns): Part => ({ kind: "blink", ...blink });

const mouthOf = (mouth: Patterns): Part => ({ kind: "volume-mouth", ...mouth });

const partsOf = (
  entry: Readonly<{ state?: string; blink?: Patterns; mouth?: Patterns }>,
): readonly Part[] => [
  ...optional(entry.state),
  ...pipe(optional(entry.blink), Arr.map(blinkOf)),
  ...pipe(optional(entry.mouth), Arr.map(mouthOf)),
];

/** @internal */
export const tachieArt = ({
  entry,
  locate,
}: Readonly<{ entry: TachieEntry; locate: (path: string) => string }>): Tachie => {
  if ("psd" in entry) {
    return {
      kind: "psd",
      psd: locate(entry.psd),
      favorites: Option.map(Option.fromNullishOr(entry.favorites), locate),
      parts: partsOf(entry),
    };
  }
  return {
    kind: "image",
    closed: locate(entry.closed),
    open: Option.map(Option.fromNullishOr(entry.open), locate),
  };
};
