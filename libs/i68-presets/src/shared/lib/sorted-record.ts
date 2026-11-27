import { Array as Arr, Order, Record as Rec, String as Str } from "effect";

const byKey = Order.mapInput(Str.Order, ([key]: readonly [string, unknown]) => key);

export const sortedRecord = <Value>(
  entries: readonly (readonly [string, Value])[],
): Readonly<Record<string, Value>> => Rec.fromEntries(Arr.sort(entries, byKey));
