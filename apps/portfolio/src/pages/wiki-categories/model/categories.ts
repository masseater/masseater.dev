import { Array as Arr, Order, pipe } from "effect";

import type { Entry } from "#/entities/entry";

type WikiCategory = Readonly<{ name: string; entries: readonly Entry[] }>;

const categoryOf =
  (entries: readonly Entry[]) =>
  (name: string): WikiCategory => ({
    name,
    entries: pipe(
      entries,
      Arr.filter(({ tags }) => Arr.contains(tags, name)),
      Arr.sortWith(({ title }) => title, Order.String),
    ),
  });

const categoriesOf = (entries: readonly Entry[]): readonly WikiCategory[] =>
  pipe(
    entries,
    Arr.flatMap(({ tags }) => tags),
    Arr.dedupe,
    Arr.map(categoryOf(entries)),
    Arr.sortWith(({ name }) => name, Order.String),
  );

export type { WikiCategory };
export { categoriesOf };
