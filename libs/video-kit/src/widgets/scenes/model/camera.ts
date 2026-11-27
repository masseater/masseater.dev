import { Array as Arr, Option, pipe } from "effect";

import type { TimedLine, TimedScene } from "#/entities/script/index.ts";
import { HEADING_LANDS_AT } from "#/entities/script/index.ts";
import { ONE } from "#/shared/config/index.ts";
import type { Hit } from "#/shared/ui/motion.ts";

const PUNCH = 0.05;
const DRIFT = 0.025;
const FRAMINGS = 2;
const HEADING_HIT = 14;
const REVEAL_HIT = 6;
const STRESS_HIT = 10;

const progress = (elapsed: number, length: number): number => elapsed / Math.max(length, ONE);

const lineZoom = (frame: number, line: TimedLine, position: number): number =>
  ONE + (position % FRAMINGS) * PUNCH + DRIFT * progress(frame - line.from, line.duration);

export const zoomOf = ({ timed, frame }: Readonly<{ timed: TimedScene; frame: number }>): number =>
  pipe(
    timed.lines,
    Arr.findLastIndex(({ from }) => frame >= from),
    Option.flatMap((position) =>
      Option.map(Arr.get(timed.lines, position), (line) => lineZoom(frame, line, position)),
    ),
    Option.getOrElse(() => ONE + DRIFT * progress(frame, timed.duration)),
  );

export const hitsOf = (timed: TimedScene): readonly Hit[] => [
  { at: HEADING_LANDS_AT, strength: HEADING_HIT },
  ...pipe(
    timed.reveals,
    Arr.map((at) => ({ at, strength: REVEAL_HIT })),
  ),
  ...pipe(
    timed.lines,
    Arr.map(({ emphasisAt }) => emphasisAt),
    Arr.getSomes,
    Arr.map((at) => ({ at, strength: STRESS_HIT })),
  ),
];
