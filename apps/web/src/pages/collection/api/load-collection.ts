import type { QueryClient } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import type { NotFoundError } from "@tanstack/react-router";
import { Effect } from "effect";

import { entryQueries } from "#/entities/entry";
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

const loadCollection = ({
  queryClient,
  category,
}: Readonly<{ queryClient: QueryClient; category: string }>): Promise<FoundCollection> =>
  Effect.runPromise(
    Effect.promise(() => queryClient.query(entryQueries.collection(category))).pipe(
      Effect.flatMap(foundOrNotFound),
    ),
  );

export type { FoundCollection };
export { loadCollection };
