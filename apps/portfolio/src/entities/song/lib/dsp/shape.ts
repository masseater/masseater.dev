import { boundsOf, orDefault } from "./number.ts";
import type { Span } from "./number.ts";

const LIMIT = 3;
const PADE = 27;
const PADE_SQUARED = 9;
const ONE = 1;
const STEP = 1;
const SILENT = 0;
const FIRST = 0;
const NEXT = 1;
const TINY = 1e-9;

export const softTanh = (value: number): number => {
  if (value > LIMIT) {
    return ONE;
  }
  if (value < -LIMIT) {
    return -ONE;
  }
  const squared = value * value;
  return (value * (PADE + squared)) / (PADE + PADE_SQUARED * squared);
};

export interface DriveOptions extends Span {
  readonly pre: number;
  readonly post: number;
  readonly bias?: number;
}

export const drive =
  ({ pre, post, bias, ...span }: DriveOptions) =>
  (x: Float32Array): Float32Array => {
    const { start, end } = boundsOf(x.length)(span);
    const offset = orDefault(SILENT)(bias);
    const centre = softTanh(offset);
    for (let index = start; index < end; index += STEP) {
      x[index] = (softTanh((x[index] ?? SILENT) * pre + offset) - centre) * post;
    }
    return x;
  };

export type Point = readonly [time: number, value: number];

const pointAt = (points: readonly Point[], index: number): Point =>
  points[index] ?? [SILENT, SILENT];

const between = (from: Point, to: Point, time: number): number =>
  from[NEXT] + ((to[NEXT] - from[NEXT]) * (time - from[FIRST])) / (to[FIRST] - from[FIRST] || TINY);

export const curve =
  (points: readonly Point[]) =>
  (time: number): number => {
    const first = pointAt(points, FIRST);
    if (time <= first[FIRST]) {
      return first[NEXT];
    }
    for (let index = NEXT; index < points.length; index += STEP) {
      const to = pointAt(points, index);
      if (time < to[FIRST]) {
        return between(pointAt(points, index - NEXT), to, time);
      }
    }
    return pointAt(points, points.length - NEXT)[NEXT];
  };
