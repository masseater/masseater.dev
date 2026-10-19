import { Effect } from "effect";

import { entryOf, foundOrNotFound, preloadBody } from "#/entities/entry";
import type { EntryResult } from "#/entities/entry";

type FoundEntry = Extract<EntryResult, Readonly<{ status: "found" }>>;

const loadEntry = (params: Readonly<{ category: string; slug: string }>): Promise<FoundEntry> =>
  Effect.runPromise(
    entryOf(params).pipe(
      Effect.flatMap(foundOrNotFound),
      Effect.tap(({ entry }) => preloadBody(entry)),
    ),
  );

export type { FoundEntry };
export { loadEntry };
