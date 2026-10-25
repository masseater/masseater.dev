import { Array as Arr, Order, Record as Rec, identity, pipe } from "effect";

import type { Entry } from "#/entities/entry";

const TOPIC_LIMIT = 12;

const topicsOf = (entries: readonly Entry[]): readonly string[] =>
  pipe(
    Rec.toEntries(Arr.groupBy(Arr.flatMap(entries, ({ tags }) => tags), identity)),
    Arr.sortWith(([, tagged]) => tagged.length, Order.flip(Order.Number)),
    Arr.take(TOPIC_LIMIT),
    Arr.map(([tag]) => tag),
  );

export { topicsOf };
