import { Effect } from "effect";

import { collectionOf, foundOrNotFound } from "#/entities/entry";
import type { CollectionResult } from "#/entities/entry";

type FoundCollection = Extract<CollectionResult, Readonly<{ status: "found" }>>;

const loadCollection = (category: string): Promise<FoundCollection> =>
  Effect.runPromise(collectionOf(category).pipe(Effect.flatMap(foundOrNotFound)));

export type { FoundCollection };
export { loadCollection };
