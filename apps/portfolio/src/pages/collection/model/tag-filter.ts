import { Array, Option, Order, Record, pipe } from "effect";

import type { Entry } from "#/entities/entry";

import type { CollectionSearch } from "./search";

type TagCount = Readonly<{ tag: string; count: number; search: CollectionSearch }>;

const byCount = Order.mapInput(Order.flip(Order.Number), ({ count }: TagCount) => count);

const byName = Order.mapInput(Order.String, ({ tag }: TagCount) => tag);

const tagCounts = (entries: readonly Entry[]): readonly TagCount[] =>
  pipe(
    entries,
    Array.flatMap(({ tags }) => tags),
    Array.groupBy((tag) => tag),
    Record.toEntries,
    Array.map(([tag, all]) => ({ tag, count: all.length, search: { tag } })),
    Array.sortBy(byCount, byName),
  );

const withTag =
  (tag: Option.Option<string>) =>
  (entries: readonly Entry[]): readonly Entry[] =>
    Option.match(tag, {
      onNone: () => entries,
      onSome: (wanted) =>
        pipe(
          entries,
          Array.filter(({ tags }) => Array.contains(tags, wanted)),
        ),
    });

export type { TagCount };
export { tagCounts, withTag };
