import { Effect } from "effect";
import type { Heading } from "sloppedia";

import { entryOf, foundOrNotFound, loadedHeadings, preloadBody } from "#/entities/entry/index.ts";
import type { Entry } from "#/entities/entry/index.ts";

export type FoundArticle = Readonly<{ entry: Entry; headings: readonly Heading[] }>;

export const loadArticle = ({ slug }: Readonly<{ slug: string }>): Promise<FoundArticle> =>
  Effect.runPromise(
    entryOf({ category: "sloppedia", slug }).pipe(
      Effect.flatMap(foundOrNotFound),
      Effect.tap(({ entry }) => preloadBody(entry)),
      Effect.map(({ entry }) => ({ entry, headings: loadedHeadings(entry) })),
    ),
  );
