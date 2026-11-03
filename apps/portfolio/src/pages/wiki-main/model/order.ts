import { Array as Arr, Order } from "effect";

import type { Entry } from "#/entities/entry";

const RECENT_COUNT = 8;

const recent = (entries: readonly Entry[]): readonly Entry[] => Arr.take(entries, RECENT_COUNT);

const byTitle = (entries: readonly Entry[]): readonly Entry[] =>
  Arr.sortWith(entries, ({ title }) => title, Order.String);

export { byTitle, recent };
