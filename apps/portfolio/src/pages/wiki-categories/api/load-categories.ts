import { Effect } from "effect";

import { collectionOf, foundOrNotFound } from "#/entities/entry";
import { categoriesOf } from "#/pages/wiki-categories/model/categories";
import type { WikiCategory } from "#/pages/wiki-categories/model/categories";

const loadCategories = (): Promise<readonly WikiCategory[]> =>
  Effect.runPromise(
    collectionOf("sloppedia").pipe(
      Effect.flatMap(foundOrNotFound),
      Effect.map(({ entries }) => categoriesOf(entries)),
    ),
  );

export { loadCategories };
