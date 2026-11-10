import { Effect } from "effect";

import { part, partStaff } from "#/entities/catalog/model/part.table";
import { person } from "#/entities/catalog/model/person.table";
import { song } from "#/entities/catalog/model/song.table";
import { video } from "#/entities/catalog/model/video.table";

import { resetDatabase } from "./d1.test.support";
import { catalogDb } from "./db.server";

type Songs = Readonly<{ unused: number; once: number; twiceLater: number; twiceEarlier: number }>;

type Videos = Readonly<{ empty: number; short: number; longLater: number; longEarlier: number }>;

type People = Readonly<{
  idle: number;
  single: number;
  doubleLater: number;
  doubleEarlier: number;
}>;

type Placed = Readonly<{ videoId: number; position: number; songId: number }>;

type Parts = Readonly<{ opening: number; middle: number }>;

const FIRST = 1;

const SECOND = 2;

const THIRD = 3;

const thumbnailOf = (title: string): string => `https://example.com/thumbnail/${title}.jpg`;

const addSong = (title: string): Effect.Effect<number> =>
  Effect.promise(() =>
    catalogDb.insert(song).values({ title, artist: "作者" }).returning({ id: song.id }).get(),
  ).pipe(Effect.map((row) => row.id));

const addVideo = (title: string): Effect.Effect<number> =>
  Effect.promise(() =>
    catalogDb
      .insert(video)
      .values({
        title,
        url: `https://example.com/watch/${title}`,
        uploader: "投稿者",
        thumbnailUrl: thumbnailOf(title),
      })
      .returning({ id: video.id })
      .get(),
  ).pipe(Effect.map((row) => row.id));

const addPerson = (name: string): Effect.Effect<number> =>
  Effect.promise(() =>
    catalogDb.insert(person).values({ name }).returning({ id: person.id }).get(),
  ).pipe(Effect.map((row) => row.id));

const addPart = (placed: Placed): Effect.Effect<number> =>
  Effect.promise(() => catalogDb.insert(part).values(placed).returning({ id: part.id }).get()).pipe(
    Effect.map((row) => row.id),
  );

const seedSongs = Effect.all({
  unused: addSong("使われない曲"),
  once: addSong("ん 一度だけの曲"),
  twiceLater: addSong("い 二本で使う曲"),
  twiceEarlier: addSong("あ 二本で使う曲"),
});

const seedVideos = Effect.all({
  empty: addVideo("パートの無い動画"),
  short: addVideo("短いメドレー"),
  longLater: addVideo("ん 長いメドレー"),
  longEarlier: addVideo("あ 長いメドレー"),
});

const seedPeople = Effect.all({
  idle: addPerson("担当の無い人"),
  single: addPerson("一つだけの人"),
  doubleLater: addPerson("b 二つの人"),
  doubleEarlier: addPerson("a 二つの人"),
});

const seedParts = (songs: Songs, videos: Videos): Effect.Effect<Parts> =>
  Effect.all({
    opening: addPart({ videoId: videos.longLater, position: FIRST, songId: songs.twiceLater }),
    middle: addPart({ videoId: videos.longLater, position: SECOND, songId: songs.twiceLater }),
    ending: addPart({ videoId: videos.longLater, position: THIRD, songId: songs.twiceEarlier }),
    intro: addPart({ videoId: videos.longEarlier, position: FIRST, songId: songs.twiceEarlier }),
    bridge: addPart({ videoId: videos.longEarlier, position: SECOND, songId: songs.twiceLater }),
    reprise: addPart({ videoId: videos.longEarlier, position: THIRD, songId: songs.twiceEarlier }),
    solo: addPart({ videoId: videos.short, position: FIRST, songId: songs.once }),
  });

const seedStaff = (parts: Parts, people: People): Effect.Effect<unknown> =>
  Effect.promise(() =>
    catalogDb.insert(partStaff).values([
      { partId: parts.opening, personId: people.doubleLater, role: "audio" },
      { partId: parts.middle, personId: people.doubleLater, role: "audio" },
      { partId: parts.opening, personId: people.doubleEarlier, role: "video" },
      { partId: parts.middle, personId: people.doubleEarlier, role: "video" },
      { partId: parts.opening, personId: people.single, role: "other" },
    ]),
  );

const seedCatalog = Effect.gen(function* seedCatalog() {
  yield* resetDatabase;
  const songs = yield* seedSongs;
  const videos = yield* seedVideos;
  const people = yield* seedPeople;
  const parts = yield* seedParts(songs, videos);
  yield* seedStaff(parts, people);
  return { songs, videos, people };
});

export { seedCatalog, thumbnailOf };
