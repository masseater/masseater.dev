import type { Sounding } from "@r_masseater/fumx-parser/analysis";
import { Array as Arr, Option, Order, pipe } from "effect";

import { MELODIC, hasRole, highest, lowest, soundingAt } from "#/shared/lib/voices.ts";

export interface OuterPair {
  readonly tick: number;
  readonly melody: Sounding;
  readonly bass: Sounding;
}

const pickAt =
  (
    soundings: readonly Sounding[],
    pick: (found: Arr.NonEmptyReadonlyArray<Sounding>) => Sounding,
  ) =>
  (tick: number): Option.Option<Sounding> =>
    pipe(
      soundingAt(soundings)(tick),
      Arr.match({ onEmpty: () => Option.none(), onNonEmpty: (found) => Option.some(pick(found)) }),
    );

export const outerVoicesOf = (soundings: readonly Sounding[]): readonly OuterPair[] => {
  const melodic = pipe(soundings, Arr.filter(hasRole(MELODIC)));
  const low = pipe(soundings, Arr.filter(hasRole(["bass"])));
  const topAt = pickAt(melodic, highest);
  const bottomAt = pickAt(low, lowest);
  const ticks = pipe(
    [...melodic, ...low],
    Arr.map((sounding) => sounding.start),
    Arr.dedupe,
    (all) => Arr.sort(all, Order.Number),
  );
  const pairAt = (tick: number): Option.Option<OuterPair> =>
    pipe(
      Option.all({ melody: topAt(tick), bass: bottomAt(tick) }),
      Option.map(({ melody, bass }) => ({ tick, melody, bass })),
    );
  return pipe(ticks, Arr.map(pairAt), Arr.getSomes);
};
