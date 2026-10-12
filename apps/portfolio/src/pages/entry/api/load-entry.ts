import { Effect } from "effect";

import { entryOf, foundOrNotFound } from "#/entities/entry";
import type { EntryResult } from "#/entities/entry";

type FoundEntry = Extract<EntryResult, Readonly<{ status: "found" }>>;

const loadEntry = (params: Readonly<{ category: string; slug: string }>): Promise<FoundEntry> =>
  Effect.runPromise(entryOf(params).pipe(Effect.flatMap(foundOrNotFound)));

export type { FoundEntry };
export { loadEntry };
