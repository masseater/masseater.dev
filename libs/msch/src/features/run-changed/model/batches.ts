import { Array as Arr, Option, Order, pipe } from "effect";
import { dual } from "effect/Function";

import type { Unit } from "./units.ts";

interface Batch {
  readonly units: readonly Unit[];
  readonly sources: number;
}

const ARITY = 2;
const NO_BATCHES: readonly Batch[] = [];
const EMPTY_BATCH: Batch = { units: [], sources: 0 };

const bySourcesDescending = Order.mapInput(Order.flip(Order.Number), (unit: Unit) => unit.sources);
const byName = Order.mapInput(Order.String, (unit: Unit) => unit.name);

const added = (batch: Batch, unit: Unit): Batch => ({
  units: [...batch.units, unit],
  sources: batch.sources + unit.sources,
});

const joined = (batches: readonly Batch[], unit: Unit, index: number): readonly Batch[] =>
  pipe(
    Arr.modify(batches, index, (batch) => added(batch, unit)),
    Option.getOrElse(() => batches),
  );

const placed = (batches: readonly Batch[], unit: Unit, limit: number): readonly Batch[] =>
  pipe(
    batches,
    Arr.findFirstIndex((batch) => batch.sources + unit.sources <= limit),
    Option.match({
      onNone: () => [...batches, added(EMPTY_BATCH, unit)],
      onSome: (index) => joined(batches, unit, index),
    }),
  );

const filled = (
  batches: readonly Batch[],
  units: readonly Unit[],
  limit: number,
): readonly Batch[] =>
  Arr.matchLeft(units, {
    onEmpty: () => batches,
    onNonEmpty: (unit, rest) => filled(placed(batches, unit, limit), rest, limit),
  });

const batched = (units: readonly Unit[], limit: number): readonly (readonly Unit[])[] => {
  const ordered = pipe(units, Arr.sortBy(bySourcesDescending, byName));
  return pipe(
    filled(NO_BATCHES, ordered, limit),
    Arr.map((batch) => batch.units),
  );
};

/** @internal */
export const batchesOf: {
  (limit: number): (units: readonly Unit[]) => readonly (readonly Unit[])[];
  (units: readonly Unit[], limit: number): readonly (readonly Unit[])[];
} = dual(ARITY, batched);
