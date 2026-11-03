import { Effect } from "effect";

import { entryOf, foundOrNotFound, preloadBody } from "#/entities/entry";
import type { EntryResult } from "#/entities/entry";

type FoundArticle = Extract<EntryResult, Readonly<{ status: "found" }>>;

const loadArticle = ({ slug }: Readonly<{ slug: string }>): Promise<FoundArticle> =>
  Effect.runPromise(
    entryOf({ category: "sloppedia", slug }).pipe(
      Effect.flatMap(foundOrNotFound),
      Effect.tap(({ entry }) => preloadBody(entry)),
    ),
  );

export type { FoundArticle };
export { loadArticle };
