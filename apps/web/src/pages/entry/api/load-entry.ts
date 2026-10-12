import type { QueryClient } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import type { NotFoundError } from "@tanstack/react-router";
import { Effect } from "effect";

import { entryQueries } from "#/entities/entry";
import type { EntryResult } from "#/entities/entry";

type FoundEntry = Extract<EntryResult, Readonly<{ status: "found" }>>;

const foundOrNotFound = (result: EntryResult): Effect.Effect<FoundEntry, NotFoundError> => {
  if (result.status === "missing") {
    return Effect.fail(notFound());
  }
  return Effect.succeed(result);
};

const loadEntry = ({
  queryClient,
  params: { category, slug },
}: Readonly<{
  queryClient: QueryClient;
  params: Readonly<{ category: string; slug: string }>;
}>): Promise<FoundEntry> =>
  Effect.runPromise(
    Effect.promise(() => queryClient.query(entryQueries.detail(category, slug))).pipe(
      Effect.flatMap(foundOrNotFound),
    ),
  );

export type { FoundEntry };
export { loadEntry };
