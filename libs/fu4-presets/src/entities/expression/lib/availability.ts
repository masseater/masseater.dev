import type { Option } from "effect";
import { Array as Arr, Order, Record as Rec, pipe } from "effect";

import availability from "#/shared/data/availability.json" with { type: "json" };

export interface Availability {
  readonly contexts: readonly string[];
  readonly functions: readonly string[];
}

const KEYS: Readonly<Record<string, Availability>> = availability;

export const workflowKey = (key: string): Option.Option<Availability> => Rec.get(KEYS, key);

const byKey = Order.mapInput(Order.String, ([key]: readonly [string, Availability]) => key);

export const SPECIAL: Readonly<Record<string, readonly string[]>> = pipe(
  Arr.sort(Rec.toEntries(KEYS), byKey),
  Arr.flatMap(([key, found]) =>
    pipe(
      found.functions,
      Arr.map((name) => [name, key] as const),
    ),
  ),
  Arr.groupBy(([name]) => name),
  Rec.map((pairs) =>
    pipe(
      pairs,
      Arr.map(([, key]) => key),
    ),
  ),
);
