import { Schema } from "effect";

import type { Grid } from "./timing.ts";

export const AtSchema = Schema.Union([
  Schema.Struct({ bar: Schema.Finite, step: Schema.Finite }),
  Schema.Struct({ seconds: Schema.Finite }),
]);

export const LengthSchema = Schema.Union([
  Schema.Struct({ sixteenths: Schema.Finite }),
  Schema.Struct({ bars: Schema.Finite }),
  Schema.Struct({ seconds: Schema.Finite }),
]);

export type At = typeof AtSchema.Type;

export type Length = typeof LengthSchema.Type;

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
