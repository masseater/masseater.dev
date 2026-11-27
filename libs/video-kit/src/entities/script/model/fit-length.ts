import { Array as Arr, Number as Num, pipe } from "effect";

import { NOTHING } from "#/shared/config/index.ts";

import { frames } from "./frames.ts";
import type { TimedScene } from "./timeline.ts";

const MAX_STRETCH_SECONDS = 2.5;

export type Unplaced = Omit<TimedScene, "from">;

export const totalOf = (scenes: readonly Unplaced[]): number =>
  pipe(
    scenes,
    Arr.map(({ duration }) => duration),
    (durations) => Num.sumAll(durations),
  );

const isStretchable = ({ scene, reveals }: Unplaced): boolean =>
  reveals.length > NOTHING && !("fixedSeconds" in scene);

export const fitLength = ({
  scenes,
  target,
}: Readonly<{ scenes: readonly Unplaced[]; target: number }>): readonly Unplaced[] => {
  const total = totalOf(scenes);
  const stretchable = pipe(scenes, Arr.filter(isStretchable));
  if (total >= target || Arr.isReadonlyArrayEmpty(stretchable)) {
    return scenes;
  }
  const share = Math.min(
    Math.floor((target - total) / stretchable.length),
    frames(MAX_STRETCH_SECONDS),
  );
  return pipe(
    scenes,
    Arr.map((timed) => {
      if (isStretchable(timed)) {
        return {
          scene: timed.scene,
          lines: timed.lines,
          reveals: timed.reveals,
          duration: timed.duration + share,
        };
      }
      return timed;
    }),
  );
};
