import { Array as Arr, Option, pipe } from "effect";

import type { TimedLine } from "#/entities/cut/index.ts";
import { ONE } from "#/shared/config/index.ts";

const PUNCH = 0.05;
const FRAMINGS = 2;

export const zoomOf = ({
  lines,
  frame,
}: Readonly<{ lines: readonly TimedLine[]; frame: number }>): number =>
  pipe(
    lines,
    Arr.findLastIndex(({ from }) => frame >= from),
    Option.match({
      onNone: () => ONE,
      onSome: (position) => ONE + (position % FRAMINGS) * PUNCH,
    }),
  );
