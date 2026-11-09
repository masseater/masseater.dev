import { Array, Option, Order, Record, pipe } from "effect";

import type { TagSearch } from "./search";

type Tagged = Readonly<{ tags: readonly string[] }>;

type TagCount = Readonly<{ tag: string; count: number; search: TagSearch }>;

const byCount = Order.mapInput(Order.flip(Order.Number), ({ count }: TagCount) => count);

const byName = Order.mapInput(Order.String, ({ tag }: TagCount) => tag);

const tagCounts = (items: readonly Tagged[]): readonly TagCount[] =>
  pipe(
    items,
    Array.flatMap(({ tags }) => tags),
    Array.groupBy((tag) => tag),
    Record.toEntries,
    Array.map(([tag, all]) => ({ tag, count: all.length, search: { tag } })),
    Array.sortBy(byCount, byName),
  );

const withTag =
  (tag: Option.Option<string>) =>
  <Item extends Tagged>(items: readonly Item[]): readonly Item[] =>
    Option.match(tag, {
      onNone: () => items,
      onSome: (wanted) =>
        pipe(
          items,
          Array.filter(({ tags }) => Array.contains(tags, wanted)),
        ),
    });

export type { TagCount, Tagged };
export { tagCounts, withTag };
