import { Array as Arr, Option, pipe } from "effect";

import { HEADING_LANDS_AT } from "./frames.ts";
import type { Cue, TimedScene } from "./timeline.ts";

const shifted = (from: number, frames: readonly number[]): readonly Cue[] =>
  pipe(
    frames,
    Arr.map((at): Cue => ({ at: from + at, kind: "pop" })),
  );

const stressedOf = ({ lines }: TimedScene): readonly number[] =>
  pipe(
    lines,
    Arr.map(({ line, emphasisAt }) =>
      pipe(
        emphasisAt,
        Option.filter(() => line.caption),
      ),
    ),
    Arr.getSomes,
  );

export const cuesOf = (timed: TimedScene): readonly Cue[] => {
  const { scene, from, reveals } = timed;
  const popped = shifted(from, reveals);
  if (scene.kind === "title") {
    return [{ at: from, kind: "hook" }, ...popped];
  }
  if (scene.kind === "ending") {
    return [{ at: from, kind: "ending" }];
  }
  return [
    { at: from, kind: "whoosh" },
    { at: from + HEADING_LANDS_AT, kind: "stamp" },
    ...popped,
    ...shifted(from, stressedOf(timed)),
  ];
};
