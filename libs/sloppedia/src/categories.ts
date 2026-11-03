import { Array as Arr, Order, pipe } from "effect";

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

const byTitle = <Item extends Article>(articles: readonly Item[]): readonly Item[] =>
  Arr.sortWith(articles, ({ title }) => title, Order.String);

export type { WikiCategory };
export { byTitle, categoriesOf, recentOf };
