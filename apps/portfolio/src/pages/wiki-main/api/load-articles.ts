import { Effect } from "effect";

import { collectionOf, foundOrNotFound } from "#/entities/entry";
import type { CollectionResult } from "#/entities/entry";

export type FoundArticles = Extract<CollectionResult, Readonly<{ status: "found" }>>;

export const loadArticles = (): Promise<FoundArticles> =>
  Effect.runPromise(collectionOf("sloppedia").pipe(Effect.flatMap(foundOrNotFound)));
