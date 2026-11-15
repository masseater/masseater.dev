import { Effect } from "effect";

import { entryOf, foundOrNotFound, preloadBody } from "#/entities/entry/index.ts";
import type { EntryResult } from "#/entities/entry/index.ts";

export type FoundEntry = Extract<EntryResult, Readonly<{ status: "found" }>>;

export const loadEntry = (
  params: Readonly<{ category: string; slug: string }>,
): Promise<FoundEntry> =>
  Effect.runPromise(
    entryOf(params).pipe(
      Effect.flatMap(foundOrNotFound),
      Effect.tap(({ entry }) => preloadBody(entry)),
    ),
  );
