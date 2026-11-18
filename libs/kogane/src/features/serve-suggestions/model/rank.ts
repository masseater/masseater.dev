import { Array as Arr, Number as Num, Order, pipe } from "effect";

import type { Vector } from "#/shared/lib/embedder.ts";

const THRESHOLD = 0.69;
const MARGIN = 0.06;
const LIMIT = 3;

export interface Scored<Item> {
  readonly item: Item;
  readonly score: number;
}

export interface Candidate<Item> {
  readonly item: Item;
  readonly vector: Vector;
}

const similarity = (left: Vector, right: Vector): number =>
  pipe(
    left,
    Arr.zipWith(right, (one, other) => one * other),
    Num.sumAll,
  );

const byScore = <Item>(): Order.Order<Scored<Item>> =>
  Order.flip(Order.mapInput(Num.Order, ({ score }: Scored<Item>) => score));

const closeTo = <Item>(
  sorted: Arr.NonEmptyReadonlyArray<Scored<Item>>,
): readonly Scored<Item>[] => {
  const floor = Num.max(THRESHOLD, Arr.headNonEmpty(sorted).score - MARGIN);
  return pipe(
    sorted,
    Arr.takeWhile(({ score }) => score >= floor),
    Arr.take(LIMIT),
  );
};

/** @internal */
export const rank =
  (query: Vector) =>
  <Item>(candidates: readonly Candidate<Item>[]): readonly Scored<Item>[] =>
    pipe(
      candidates,
      Arr.map(({ item, vector }): Scored<Item> => ({ item, score: similarity(query, vector) })),
      Arr.sortWith((scored) => scored, byScore<Item>()),
      Arr.match({ onEmpty: (): readonly Scored<Item>[] => [], onNonEmpty: closeTo }),
    );
