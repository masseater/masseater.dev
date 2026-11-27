import { Array as Arr, Match, Number as Num, Option, pipe } from "effect";

import { FPS, NOTHING, ONE, Timing } from "#/shared/config/index.ts";

import type { Line, Scene } from "./script.ts";
import { textOf } from "./script.ts";

export const frames = (seconds: number): number => Math.round(seconds * FPS);

export const estimateSeconds = (line: Line): number =>
  Math.min(
    Timing.MAX_LINE_SECONDS,
    Math.max(Timing.MIN_LINE_SECONDS, textOf(line).length / Timing.CHARACTERS_PER_SECOND),
  );

export const HEADING_LANDS_AT = 4;

const lengthBefore = (line: Line, position: number): number =>
  pipe(
    line.segments,
    Arr.take(position),
    Arr.map(({ text }) => text.length),
    (lengths) => Num.sumAll(lengths),
  );

export interface Spoken {
  readonly line: Line;
  readonly from: number;
  readonly duration: number;
}

export const emphasisAtOf = ({ line, from, duration }: Spoken): Option.Option<number> =>
  pipe(
    line.segments,
    Arr.findFirstIndex(({ emphasis }) => emphasis),
    Option.map(
      (position) =>
        from +
        Math.round((duration * lengthBefore(line, position)) / Math.max(textOf(line).length, ONE)),
    ),
  );

interface Pace {
  readonly start: number;
  readonly step: number;
  readonly count: number;
}

const TITLE = { start: 0.5, step: 0.35 } as const;
const POINTS = { start: 0.35, step: 0.75 } as const;
const RATING = { start: 0.3, step: 0.18 } as const;

const paceOf = (scene: Scene): Option.Option<Pace> =>
  Match.value<Scene>(scene).pipe(
    Match.discriminatorsExhaustive("kind")({
      title: ({ items }) => Option.some({ ...TITLE, count: items.length }),
      points: ({ items }) => Option.some({ ...POINTS, count: items.length }),
      rating: ({ max }) => Option.some({ ...RATING, count: max }),
      ending: () => Option.none<Pace>(),
      talk: () => Option.none<Pace>(),
      code: () => Option.none<Pace>(),
      media: () => Option.none<Pace>(),
      quote: () => Option.none<Pace>(),
    }),
  );

const NO_REVEALS: readonly number[] = [];

export const revealsOf = (scene: Scene): readonly number[] =>
  pipe(
    paceOf(scene),
    Option.filter(({ count }) => count > NOTHING),
    Option.map(({ start, step, count }) =>
      Arr.makeBy(count, (position) => frames(start + step * position)),
    ),
    Option.getOrElse(() => NO_REVEALS),
  );
