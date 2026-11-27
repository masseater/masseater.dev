import { Effect } from "effect";

import { fromCatalog } from "#/shared/db/index.server.ts";
import { part, person, song, video } from "#/shared/db/index.ts";

export const getStats = Effect.all(
  {
    songs: fromCatalog((db) => db.$count(song)),
    videos: fromCatalog((db) => db.$count(video)),
    parts: fromCatalog((db) => db.$count(part)),
    people: fromCatalog((db) => db.$count(person)),
  },
  { concurrency: "unbounded" },
).pipe(Effect.withSpan("catalog.stats"));
