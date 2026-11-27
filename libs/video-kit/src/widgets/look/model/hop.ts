import { Array as Arr, Number as Num, pipe } from "effect";

import type { TimedCut } from "#/entities/cut/index.ts";

const HOP_FRAMES = 8;
const HOP_HEIGHT = 28;

const startsOf = (cuts: readonly TimedCut[], voices: readonly number[]): readonly number[] =>
  pipe(
    cuts,
    Arr.filter(({ voice }) => voices.includes(voice)),
    Arr.flatMap(({ from, lines }) =>
      pipe(
        lines,
        Arr.map((line) => from + line.from),
      ),
    ),
  );

export const hopOf = ({
  cuts,
  voices,
  frame,
}: Readonly<{ cuts: readonly TimedCut[]; voices: readonly number[]; frame: number }>): number =>
  pipe(
    startsOf(cuts, voices),
    Arr.filter((start) => frame >= start && frame < start + HOP_FRAMES),
    Arr.map((start) => -HOP_HEIGHT * Math.sin((Math.PI * (frame - start)) / HOP_FRAMES)),
    Num.sumAll,
  );
