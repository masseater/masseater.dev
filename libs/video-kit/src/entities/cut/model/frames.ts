import { Array as Arr, Number as Num, Option, pipe } from "effect";

import { FPS, ONE, Timing } from "#/shared/config/index.ts";
import type { Segment } from "#/shared/lib/segment.ts";
import { plainOf } from "#/shared/lib/segment.ts";

export const frames = (seconds: number): number => Math.round(seconds * FPS);

export const estimateSeconds = (segments: readonly Segment[]): number =>
  Math.min(
    Timing.MAX_LINE_SECONDS,
    Math.max(Timing.MIN_LINE_SECONDS, plainOf(segments).length / Timing.CHARACTERS_PER_SECOND),
  );

const lengthBefore = (segments: readonly Segment[], position: number): number =>
  pipe(
    segments,
    Arr.take(position),
    Arr.map(({ text }) => text.length),
    (lengths) => Num.sumAll(lengths),
  );

export interface Spoken {
  readonly segments: readonly Segment[];
  readonly from: number;
  readonly duration: number;
}

export const emphasisAtOf = ({ segments, from, duration }: Spoken): Option.Option<number> =>
  pipe(
    segments,
    Arr.findFirstIndex(({ emphasis }) => emphasis),
    Option.map(
      (position) =>
        from +
        Math.round(
          (duration * lengthBefore(segments, position)) / Math.max(plainOf(segments).length, ONE),
        ),
    ),
  );
