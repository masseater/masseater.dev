import type { Grid } from "#/entities/song/lib/studio/timing.ts";

export type At = Readonly<{ bar: number; step: number }> | Readonly<{ seconds: number }>;

export type Length =
  | Readonly<{ sixteenths: number }>
  | Readonly<{ bars: number }>
  | Readonly<{ seconds: number }>;

export const timeOf =
  (grid: Grid) =>
  (at: At): number => {
    if ("seconds" in at) {
      return at.seconds;
    }
    return grid.at(at.bar, at.step);
  };

export const secondsOf =
  (grid: Grid) =>
  (length: Length): number => {
    if ("sixteenths" in length) {
      return grid.sixteenth * length.sixteenths;
    }
    if ("bars" in length) {
      return grid.bar * length.bars;
    }
    return length.seconds;
  };
