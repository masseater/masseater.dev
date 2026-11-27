import { Array as Arr, Option, pipe } from "effect";

import type { TimedCut } from "#/entities/cut/index.ts";

const FLAP_FRAMES = 4;
const HALF = 2;
const OPEN_PHASE = 0;

export const isSpeaking = ({
  cuts,
  frame,
}: Readonly<{ cuts: readonly TimedCut[]; frame: number }>): boolean =>
  pipe(
    cuts,
    Arr.flatMap(({ from, lines }) =>
      pipe(
        lines,
        Arr.filter(({ audio }) => Option.isSome(audio)),
        Arr.map((line) => ({ start: from + line.from, end: from + line.from + line.duration })),
      ),
    ),
    Arr.some(({ start, end }) => frame >= start && frame < end),
  );

export const isMouthOpen = ({
  cuts,
  frame,
}: Readonly<{ cuts: readonly TimedCut[]; frame: number }>): boolean =>
  isSpeaking({ cuts, frame }) && Math.floor(frame / FLAP_FRAMES) % HALF === OPEN_PHASE;
