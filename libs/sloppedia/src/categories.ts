import { Array as Arr, Option, Order, String as Str, pipe } from "effect";

import { newestFirst } from "./article.ts";
import type { Article } from "./article.ts";

type WikiCategory<Item extends Article> = Readonly<{ name: string; articles: readonly Item[] }>;

const categoryOf =
  <Item extends Article>(articles: readonly Item[]) =>
  (name: string): WikiCategory<Item> => ({
    name,
    articles: pipe(
      articles,
      Arr.filter(({ tags }) => Arr.contains(tags, name)),
      Arr.sortWith(({ title }) => title, Order.String),
    ),
  });

const categoriesOf = <Item extends Article>(
  articles: readonly Item[],
): readonly WikiCategory<Item>[] =>
  pipe(
    articles,
    Arr.flatMap(({ tags }) => tags),
    Arr.dedupe,
    Arr.map(categoryOf(articles)),
    Arr.sortWith(({ name }) => name, Order.String),
  );

const RECENT_COUNT = 8;

const recentOf = <Item extends Article>(articles: readonly Item[]): readonly Item[] =>
  Arr.take(newestFirst(articles), RECENT_COUNT);

const RANDOM_COUNT = 8;

const HASH_MODULUS = 1_000_000_007;
const HASH_MULTIPLIER = 33;
const FIRST = 0;

const hashOf = (text: string): number => {
  let hash = FIRST;
  for (const char of text) {
    hash =
      (hash * HASH_MULTIPLIER + Option.getOrElse(Str.codePointAt(FIRST)(char), () => FIRST)) %
      HASH_MODULUS;
  }
  return hash;
};

const pickupSeedOf = (articles: readonly Article[]): string =>
  pipe(
    articles,
    Arr.map(({ updated }) => updated),
    Arr.sortWith((updated) => updated, Order.String),
    Arr.last,
    Option.getOrElse(() => ""),
    (latest) => `${latest}:${String(articles.length)}`,
  );

const randomOf = <Item extends Article>(articles: readonly Item[]): readonly Item[] => {
  const seed = pickupSeedOf(articles);
  return Arr.take(
    Arr.sortWith(articles, ({ slug }) => hashOf(`${seed}:${slug}`), Order.Number),
    RANDOM_COUNT,
  );
};

const byTitle = <Item extends Article>(articles: readonly Item[]): readonly Item[] =>
  Arr.sortWith(articles, ({ title }) => title, Order.String);

export type { WikiCategory };
export { byTitle, categoriesOf, randomOf, recentOf };
