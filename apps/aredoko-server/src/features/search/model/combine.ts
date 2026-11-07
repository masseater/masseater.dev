import { Array, HashSet, Order, pipe } from "effect";

const IMAGE_OFFSET = 0.05;
const NAME_BONUS = 0.05;
const NO_SIMILARITY = 0;

interface Hit {
  readonly id: number;
  readonly similarity: number;
}

const bestOf =
  (hits: readonly Hit[]) =>
  (id: number): number =>
    pipe(
      hits,
      Array.filter((hit) => hit.id === id),
      Array.map(({ similarity }) => similarity),
      Array.match({ onEmpty: () => NO_SIMILARITY, onNonEmpty: Array.max(Order.Number) }),
    );

const combine = ({
  images,
  texts,
  names,
}: {
  readonly images: readonly Hit[];
  readonly texts: readonly Hit[];
  readonly names: readonly number[];
}): readonly (readonly [id: number, score: number])[] => {
  const image = bestOf(images);
  const text = bestOf(texts);
  const named = HashSet.fromIterable(names);
  const scoreOf = (id: number): readonly [number, number] => [
    id,
    Math.max(image(id) + IMAGE_OFFSET, text(id)) + Number(HashSet.has(named, id)) * NAME_BONUS,
  ];
  return pipe(
    [...images, ...texts],
    Array.map(({ id }) => id),
    Array.appendAll(names),
    Array.dedupe,
    Array.map(scoreOf),
    Array.sortWith(([, score]) => score, Order.flip(Order.Number)),
  );
};

export { combine };
export type { Hit };
