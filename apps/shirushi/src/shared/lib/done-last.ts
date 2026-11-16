import { Array as Arr, Predicate, pipe } from "effect";

export const doneLast =
  <Item>(done: (item: Item) => boolean) =>
  (items: readonly Item[]): readonly Item[] => [
    ...pipe(items, Arr.filter(Predicate.not(done))),
    ...pipe(items, Arr.filter(done)),
  ];
