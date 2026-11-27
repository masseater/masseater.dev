import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { NOTHING } from "#/shared/config/index.ts";
import { keyed } from "#/widgets/scenes/model/keyed.ts";

import { Star } from "./star.tsx";

const slotsOf = (max: number): readonly number[] => {
  if (max <= NOTHING) {
    return [];
  }
  return Arr.makeBy(max, (position) => position);
};

export const Stars = ({
  score,
  max,
  reveals,
  frame,
}: Readonly<{
  score: number;
  max: number;
  reveals: readonly number[];
  frame: number;
}>): ReactNode => (
  <div className="text-star horizontal:text-star-h flex gap-2">
    {pipe(
      keyed({ values: slotsOf(max), label: String, reveals }),
      Arr.map(({ key, position, at }) => (
        <Star at={at} filled={position < score} frame={frame} key={key} />
      )),
    )}
  </div>
);
