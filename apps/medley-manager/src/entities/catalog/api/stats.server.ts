import { Effect } from "effect";

import { part } from "#/entities/catalog/model/part.table";
import { person } from "#/entities/catalog/model/person.table";
import { song } from "#/entities/catalog/model/song.table";
import { video } from "#/entities/catalog/model/video.table";

import { catalogDb } from "./db.server";

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
