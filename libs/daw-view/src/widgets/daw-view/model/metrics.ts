import { Array as Arr, Option, pipe } from "effect";

import { clamp } from "#/shared/lib/math.ts";

import type { Size } from "./pen.ts";

const ARRANGE = { narrowest: 12, steps: 5, margin: 1.15, preferred: 12, least: 1 } as const;
const ROLL = { widest: 16, steps: 5 } as const;
const DOUBLE = 2;
const NONE = 0;
const ONE = 1;
const WHOLE = 1e-6;
const ALL = 0.01;

const ARRANGE_STEPS = Arr.makeBy(ARRANGE.steps, (index) => ARRANGE.narrowest * DOUBLE ** index);

export const ROLL_BARS = Arr.makeBy(ROLL.steps, (index) => ROLL.widest / DOUBLE ** index);

export interface Raster extends Size {
  readonly ratio: number;
}

export interface Page {
  readonly scale: number;
  readonly width: number;
  readonly bar: number;
  readonly bars: number;
  readonly limit: number;
}

export const arrangeLevels = (fit: number): readonly number[] => {
  const least = Math.max(ARRANGE.least, fit);
  return [
    least,
    ...pipe(
      ARRANGE_STEPS,
      Arr.filter((step) => step > least * ARRANGE.margin),
    ),
  ];
};

const narrowest = (levels: readonly number[]): number =>
  pipe(
    Arr.head(levels),
    Option.getOrElse(() => ARRANGE.least),
  );

const widest = (levels: readonly number[]): number =>
  pipe(
    Arr.last(levels),
    Option.getOrElse(() => ARRANGE.least),
  );

export const fittedScale = (levels: readonly number[]): number =>
  Math.max(narrowest(levels), Math.min(ARRANGE.preferred, widest(levels)));

export const withinLevels =
  (levels: readonly number[]) =>
  (scale: number): number =>
    clamp({ low: narrowest(levels), high: widest(levels) })(scale);

const nearest = (levels: readonly number[], value: number): number => {
  let best = NONE;
  for (const [index, level] of levels.entries()) {
    if (Math.abs(level - value) < Math.abs((levels[best] ?? level) - value)) {
      best = index;
    }
  }
  return best;
};

export const stepped =
  (levels: readonly number[]) =>
  (value: number, direction: number): number => {
    const index = clamp({ low: NONE, high: levels.length - ONE })(
      nearest(levels, value) + direction,
    );
    return levels[index] ?? value;
  };

export const pageTarget = ({ scale, width, bar, bars, limit }: Page): Option.Option<number> => {
  const visible = width / scale;
  if (visible >= bars - ALL) {
    return Option.none();
  }
  const count = Math.max(ONE, Math.floor(visible + WHOLE));
  const target = Math.floor(bar / count) * count * scale;
  return Option.some(clamp({ low: NONE, high: Math.max(NONE, limit) })(target));
};

export const sizeCanvas =
  (canvas: HTMLCanvasElement) =>
  ({ width, height, ratio }: Raster): void => {
    const raster = {
      width: Math.max(ONE, Math.round(width * ratio)),
      height: Math.max(ONE, Math.round(height * ratio)),
    };
    if (canvas.width !== raster.width || canvas.height !== raster.height) {
      canvas.width = raster.width;
      canvas.height = raster.height;
    }
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  };
