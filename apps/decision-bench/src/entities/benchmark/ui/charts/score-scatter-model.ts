import { Array as Arr, pipe } from "effect";

import { pointsOf } from "#/entities/benchmark/lib/format.ts";

import type { LabelSpot } from "./label-placement.ts";
import type { Detail } from "./model-detail.ts";

export type ScatterPoint = Readonly<{
  label: string;
  mark: string;
  spot: LabelSpot;
  measure: number;
  skill: number;
  error: readonly [number, number];
  color: string;
  detail: Detail;
}>;

export type Axis = Readonly<{
  name: string;
  domain: readonly [number, (dataMax: number) => number];
  format: (value: unknown) => string;
}>;

export const describe = ({
  points,
  axis,
}: Readonly<{ points: readonly ScatterPoint[]; axis: Axis }>): string =>
  pipe(
    points,
    Arr.map(
      ({ label, measure, skill }) =>
        `${label} ${axis.name} ${axis.format(measure)}、skill ${pointsOf(skill)}`,
    ),
    Arr.join("。"),
  );
