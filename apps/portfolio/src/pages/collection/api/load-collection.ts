import { Effect } from "effect";

import { collectionOf, foundOrNotFound } from "#/entities/entry/index.ts";
import type { CollectionResult } from "#/entities/entry/index.ts";

export type FoundCollection = Extract<CollectionResult, Readonly<{ status: "found" }>>;

export const loadCollection = (category: string): Promise<FoundCollection> =>
  Effect.runPromise(collectionOf(category).pipe(Effect.flatMap(foundOrNotFound)));
