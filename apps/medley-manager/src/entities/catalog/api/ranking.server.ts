import { asc, count, countDistinct, desc, eq } from "drizzle-orm";
import { Effect } from "effect";

import { part, partStaff } from "#/entities/catalog/model/part.table";
import { person } from "#/entities/catalog/model/person.table";
import { song } from "#/entities/catalog/model/song.table";
import { video } from "#/entities/catalog/model/video.table";

import { catalogDb } from "./db.server";

const songUses = countDistinct(part.videoId);

const videoParts = count(part.id);

const personCredits = count(partStaff.id);

const rankSongs = Effect.fn("catalog.ranking.songs")(function* rankSongs(limit: number) {
  return yield* Effect.promise(() =>
    catalogDb
      .select({ id: song.id, title: song.title, useCount: songUses })
      .from(song)
      .leftJoin(part, eq(part.songId, song.id))
      .groupBy(song.id)
      .orderBy(desc(songUses), asc(song.title), asc(song.id))
      .limit(limit),
  );
});

const rankVideos = Effect.fn("catalog.ranking.videos")(function* rankVideos(limit: number) {
  return yield* Effect.promise(() =>
    catalogDb
      .select({
        id: video.id,
        title: video.title,
        kind: video.kind,
        thumbnailUrl: video.thumbnailUrl,
        partCount: videoParts,
      })
      .from(video)
      .innerJoin(part, eq(part.videoId, video.id))
      .groupBy(video.id)
      .orderBy(desc(videoParts), asc(video.title), asc(video.id))
      .limit(limit),
  );
});

const rankPeople = Effect.fn("catalog.ranking.people")(function* rankPeople(limit: number) {
  return yield* Effect.promise(() =>
    catalogDb
      .select({ id: person.id, name: person.name, creditCount: personCredits })
      .from(person)
      .leftJoin(partStaff, eq(partStaff.personId, person.id))
      .groupBy(person.id)
      .orderBy(desc(personCredits), asc(person.name))
      .limit(limit),
  );
});

export { rankPeople, rankSongs, rankVideos };
