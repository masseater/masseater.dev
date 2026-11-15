import { Effect } from "effect";

import { collectionOf, foundOrNotFound } from "#/entities/entry";
import type { CollectionResult } from "#/entities/entry";

type FoundCategories = Extract<CollectionResult, Readonly<{ status: "found" }>>;

export const loadCategories = (): Promise<FoundCategories> =>
  Effect.runPromise(collectionOf("sloppedia").pipe(Effect.flatMap(foundOrNotFound)));
