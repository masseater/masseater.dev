import { Array as Arr, pipe } from "effect";

import type { TimedScene } from "#/entities/timeline/index.ts";
import { NOTHING, ONE } from "#/shared/config/index.ts";

export interface Numbered {
  readonly timed: TimedScene;
  readonly number: number;
}

const isBody = ({ scene }: TimedScene): boolean =>
  scene.kind !== "title" && scene.kind !== "ending";

const stepOf = (timed: TimedScene): number => Number(isBody(timed));

export const numbered = (scenes: readonly TimedScene[]): readonly Numbered[] =>
  pipe(
    scenes,
    Arr.mapAccum(NOTHING, (count, timed) => {
      const next = count + stepOf(timed);
      return [next, { timed, number: Math.max(next, ONE) }];
    }),
    ([, all]) => all,
  );
