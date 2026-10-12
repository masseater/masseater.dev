import { notFound } from "@tanstack/react-router";
import type { NotFoundError } from "@tanstack/react-router";
import { Effect } from "effect";

import { entryOf } from "#/entities/entry";
import type { EntryResult } from "#/entities/entry";

type FoundEntry = Extract<EntryResult, Readonly<{ status: "found" }>>;

const foundOrNotFound = (result: EntryResult): Effect.Effect<FoundEntry, NotFoundError> => {
  if (result.status === "missing") {
    return Effect.fail(notFound());
  }
  return Effect.succeed(result);
};

const loadEntry = (params: Readonly<{ category: string; slug: string }>): Promise<FoundEntry> =>
  Effect.runPromise(entryOf(params).pipe(Effect.flatMap(foundOrNotFound)));

export type { FoundEntry };
export { loadEntry };
