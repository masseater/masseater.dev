import { Effect } from "effect";

import { part, person, song, video } from "#/shared/db";
import { catalogDb } from "#/shared/db/index.server";

const getStats = Effect.all(
  {
    songs: Effect.promise(() => catalogDb.$count(song)),
    videos: Effect.promise(() => catalogDb.$count(video)),
    parts: Effect.promise(() => catalogDb.$count(part)),
    people: Effect.promise(() => catalogDb.$count(person)),
  },
  { concurrency: "unbounded" },
).pipe(Effect.withSpan("catalog.stats"));

export { getStats };
