import { notFound } from "@tanstack/react-router";
import type { NotFoundError } from "@tanstack/react-router";
import { Effect } from "effect";

import { collectionOf } from "#/entities/entry";
import type { CollectionResult } from "#/entities/entry";

type FoundCollection = Extract<CollectionResult, Readonly<{ status: "found" }>>;

const foundOrNotFound = (
  result: CollectionResult,
): Effect.Effect<FoundCollection, NotFoundError> => {
  if (result.status === "missing") {
    return Effect.fail(notFound());
  }
  return Effect.succeed(result);
};

const loadCollection = (category: string): Promise<FoundCollection> =>
  Effect.runPromise(collectionOf(category).pipe(Effect.flatMap(foundOrNotFound)));

export type { FoundCollection };
export { loadCollection };
