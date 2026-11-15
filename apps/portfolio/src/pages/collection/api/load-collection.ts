import { Effect } from "effect";

import { collectionOf, foundOrNotFound } from "#/entities/entry";
import type { CollectionResult } from "#/entities/entry";

export type FoundCollection = Extract<CollectionResult, Readonly<{ status: "found" }>>;

export const loadCollection = (category: string): Promise<FoundCollection> =>
  Effect.runPromise(collectionOf(category).pipe(Effect.flatMap(foundOrNotFound)));
