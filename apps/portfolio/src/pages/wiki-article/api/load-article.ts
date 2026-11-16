import type { Heading } from "@masseater.dev/sloppedia";
import { Effect } from "effect";

import { entryOf, foundOrNotFound, loadedHeadings, preloadBody } from "#/entities/entry";
import type { Entry } from "#/entities/entry";

export type FoundArticle = Readonly<{ entry: Entry; headings: readonly Heading[] }>;

export const loadArticle = ({ slug }: Readonly<{ slug: string }>): Promise<FoundArticle> =>
  Effect.runPromise(
    entryOf({ category: "sloppedia", slug }).pipe(
      Effect.flatMap(foundOrNotFound),
      Effect.tap(({ entry }) => preloadBody(entry)),
      Effect.map(({ entry }) => ({ entry, headings: loadedHeadings(entry) })),
    ),
  );
