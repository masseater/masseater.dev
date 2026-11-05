import { Effect } from "effect";

import { collectionOf, foundOrNotFound } from "#/entities/entry";
import type { CollectionResult } from "#/entities/entry";

type FoundArticles = Extract<CollectionResult, Readonly<{ status: "found" }>>;

const loadArticles = (): Promise<FoundArticles> =>
  Effect.runPromise(collectionOf("sloppedia").pipe(Effect.flatMap(foundOrNotFound)));

export type { FoundArticles };
export { loadArticles };
