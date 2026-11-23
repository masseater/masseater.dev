import { curve } from "@masseater.dev/fumx-studio/dsp/shape";
import { timeOf } from "@masseater.dev/fumx-studio/studio/moment";
import type { Grid } from "@masseater.dev/fumx-studio/studio/timing";
import { Array as Arr, Record as Rec, pipe } from "effect";

import type { Automation, CurveName } from "./score-schema.ts";
import { AUTOMATION } from "./score.ts";

const NO_SHIFT = 0;

export type Curves = Readonly<Record<CurveName, (seconds: number) => number>>;

const pointsOf =
  (grid: Grid) =>
  (points: Automation[CurveName]): ((seconds: number) => number) =>
    curve(
      pipe(
        points,
        Arr.map(({ at, shift, value }) => [timeOf(grid)(at) + (shift ?? NO_SHIFT), value] as const),
      ),
    );

export const curvesOf = (grid: Grid): Curves => pipe(AUTOMATION, Rec.map(pointsOf(grid)));
