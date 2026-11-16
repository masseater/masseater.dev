import { Array as Arr, String as Str, pipe } from "effect";

import { STEPS_PER_BAR, STEPS_PER_BEAT, stepBars, totalBars } from "#/entities/song/index.ts";
import type { Structure } from "#/entities/song/index.ts";

import type { Theme } from "./theme.ts";

const ORIGIN = 0;
const IDENTITY = 1;
const NO_SKEW = 0;
const HAIRLINE = 1;
const ONE = 1;
const TOO_NARROW = 8;
const ELLIPSIS = "…";
const LAST_STEP = STEPS_PER_BAR - ONE;
const LAST_BEAT = STEPS_PER_BEAT - ONE;

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Viewport extends Size {
  readonly ratio: number;
  readonly scale: number;
  readonly scroll: number;
  readonly origin: number;
}

export interface Pen extends Viewport {
  readonly context: CanvasRenderingContext2D;
  readonly theme: Theme;
  readonly structure: Structure;
  readonly from: number;
  readonly to: number;
}

export interface Canvas {
  readonly context: CanvasRenderingContext2D;
  readonly theme: Theme;
  readonly structure: Structure;
}

export const penOf =
  (canvas: Canvas) =>
  (viewport: Viewport): Pen => ({
    ...canvas,
    ...viewport,
    from: Math.max(ORIGIN, Math.floor(viewport.scroll / viewport.scale)),
    to: Math.min(
      Math.ceil(totalBars(canvas.structure)),
      Math.ceil((viewport.scroll + viewport.width - viewport.origin) / viewport.scale),
    ),
  });

export const leftOf =
  (pen: Pen) =>
  (bar: number): number =>
    pen.origin + bar * pen.scale - pen.scroll;

export const fontOf =
  (pen: Pen) =>
  (size: number): string =>
    `${size}px ${pen.theme.font}`;

export const clear = (pen: Pen): void => {
  pen.context.setTransform(pen.ratio, NO_SKEW, NO_SKEW, pen.ratio, ORIGIN, ORIGIN);
  pen.context.globalAlpha = IDENTITY;
  pen.context.clearRect(ORIGIN, ORIGIN, pen.width, pen.height);
  pen.context.textBaseline = "middle";
  pen.context.textAlign = "left";
};

export const rules =
  (pen: Pen) =>
  (top: number, bars: readonly number[]): void => {
    const left = leftOf(pen);
    for (const bar of bars) {
      pen.context.fillRect(Math.round(left(bar)), top, HAIRLINE, pen.height - top);
    }
  };

const cut = (text: string, length: number): string =>
  `${pipe(text, Str.slice(ORIGIN, length))}${ELLIPSIS}`;

const shortened = (context: CanvasRenderingContext2D, text: string, width: number): string => {
  let { length } = text;
  while (length > ONE && context.measureText(cut(text, length)).width > width) {
    length -= ONE;
  }
  if (length > ONE) {
    return cut(text, length);
  }
  return "";
};

export const fitted =
  (context: CanvasRenderingContext2D) =>
  (text: string, width: number): string => {
    if (width < TOO_NARROW) {
      return "";
    }
    if (context.measureText(text).width <= width) {
      return text;
    }
    return shortened(context, text, width);
  };

export const visibleBars = (pen: Pen): readonly number[] => Arr.range(pen.from, pen.to);

export const everyBar =
  (pen: Pen) =>
  (step: number): readonly number[] =>
    pipe(
      Arr.range(pen.from - (pen.from % step), pen.to),
      Arr.filter((bar) => bar % step === ORIGIN),
    );

const OFF_BEATS = pipe(
  Arr.range(ONE, LAST_STEP),
  Arr.filter((step) => step % STEPS_PER_BEAT !== ORIGIN),
);

const BEATS = pipe(
  Arr.range(ONE, LAST_BEAT),
  Arr.map((beat) => beat / STEPS_PER_BEAT),
);

export const sixteenthBars = (pen: Pen): readonly number[] => {
  const toBars = stepBars(pen.structure);
  return pipe(
    Arr.range(pen.from, pen.to - ONE),
    Arr.flatMap((bar) =>
      pipe(
        OFF_BEATS,
        Arr.map((step) => toBars({ bar, step })),
      ),
    ),
  );
};

export const beatBars = (pen: Pen): readonly number[] =>
  pipe(
    Arr.range(pen.from, pen.to - ONE),
    Arr.flatMap((bar) =>
      pipe(
        BEATS,
        Arr.map((beat) => bar + beat),
      ),
    ),
  );
