import { afterAll, expect, it } from "@effect/vitest";
import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { vi } from "vite-plus/test";

import { catalogDb, part, song, songAlias, video } from "#/entities/catalog/index.server";

import { closeDatabase, resetDatabase } from "./d1.test.support";
import { whileRejecting } from "./rejecting.test.support";
import { createSong, mergeSongs } from "./song-write.server";

vi.mock("cloudflare:workers", () => import("./d1.test.support"));

afterAll(() => Effect.runPromise(closeDatabase));

const SONG_MISSING = "song not found";

const SAME_SONG = "sourceId and targetId must differ";

const FIRST = 1;

const SECOND = 2;

const THIRD = 3;

const UNKNOWN_SONG_ID = 999_999;

const SOURCE_TITLE = "消す曲";

const TARGET_TITLE = "残す曲";

const seedSongs = Effect.gen(function* seedSongs() {
  yield* resetDatabase;
  const source = yield* createSong({ title: SOURCE_TITLE, aliases: ["消す曲の別名"] });
  const target = yield* createSong({ title: TARGET_TITLE, aliases: ["残す曲の別名"] });
  const medley = yield* Effect.promise(() =>
    catalogDb
      .insert(video)
      .values({ title: "テストメドレー", url: "https://example.com/watch/1" })
      .returning({ id: video.id })
      .get(),
  );
  yield* Effect.promise(() =>
    catalogDb.insert(part).values([
      { videoId: medley.id, position: FIRST, songId: source.id },
      { videoId: medley.id, position: SECOND, songId: source.id },
      { videoId: medley.id, position: THIRD, songId: target.id },
    ]),
  );
  return { sourceId: source.id, targetId: target.id };
}).pipe(Effect.orDie);

const stored = Effect.all({
  songs: Effect.promise(() => catalogDb.select({ title: song.title }).from(song).orderBy(song.id)),
  aliases: Effect.promise(() =>
    catalogDb
      .select({ title: song.title, alias: songAlias.alias })
      .from(songAlias)
      .innerJoin(song, eq(song.id, songAlias.songId))
      .orderBy(song.id, songAlias.alias),
  ),
  parts: Effect.promise(() =>
    catalogDb
      .select({ position: part.position, title: song.title })
      .from(part)
      .leftJoin(song, eq(song.id, part.songId))
      .orderBy(part.position),
  ),
});

const SEEDED = {
  songs: [{ title: SOURCE_TITLE }, { title: TARGET_TITLE }],
  aliases: [
    { title: SOURCE_TITLE, alias: "消す曲の別名" },
    { title: TARGET_TITLE, alias: "残す曲の別名" },
  ],
  parts: [
    { position: FIRST, title: SOURCE_TITLE },
    { position: SECOND, title: SOURCE_TITLE },
    { position: THIRD, title: TARGET_TITLE },
  ],
};

const MERGED = {
  songs: [{ title: TARGET_TITLE }],
  aliases: [
    { title: TARGET_TITLE, alias: "残す曲の別名" },
    { title: TARGET_TITLE, alias: SOURCE_TITLE },
    { title: TARGET_TITLE, alias: "消す曲の別名" },
  ],
  parts: [
    { position: FIRST, title: TARGET_TITLE },
    { position: SECOND, title: TARGET_TITLE },
    { position: THIRD, title: TARGET_TITLE },
  ],
};

it.effect("mergeSongs は消す側のパートと題名と別名を残す側へ移し、消す側を消す", () =>
  Effect.gen(function* movesEverything() {
    const ids = yield* seedSongs;
    const merged = yield* mergeSongs(ids);
    expect(merged.id).toBe(ids.targetId);
    const after = yield* stored;
    expect(after).toStrictEqual(MERGED);
  }),
);

it.effect("mergeSongs は別名の追加を D1 が拒むと、パートを移さず元のまま残す", () =>
  Effect.gen(function* keepsPartsOnAliasFailure() {
    const ids = yield* seedSongs;
    yield* mergeSongs(ids).pipe(
      whileRejecting({ event: "INSERT", table: "song_alias" }),
      Effect.flip,
    );
    const after = yield* stored;
    expect(after).toStrictEqual(SEEDED);
  }),
);

it.effect("mergeSongs は消す側の削除を D1 が拒むと、パートも別名も元のまま残す", () =>
  Effect.gen(function* keepsEverythingOnDeleteFailure() {
    const ids = yield* seedSongs;
    yield* mergeSongs(ids).pipe(whileRejecting({ event: "DELETE", table: "song" }), Effect.flip);
    const after = yield* stored;
    expect(after).toStrictEqual(SEEDED);
  }),
);

it.effect("mergeSongs は同じ曲どうしや無い曲を指すと失敗し、何も書き換えない", () =>
  Effect.gen(function* rejectsBadInput() {
    const ids = yield* seedSongs;
    const same = yield* mergeSongs({ sourceId: ids.targetId, targetId: ids.targetId }).pipe(
      Effect.flip,
    );
    const missing = yield* mergeSongs({ sourceId: ids.sourceId, targetId: UNKNOWN_SONG_ID }).pipe(
      Effect.flip,
    );
    expect(same.message).toBe(SAME_SONG);
    expect(missing.message).toBe(SONG_MISSING);
    const after = yield* stored;
    expect(after).toStrictEqual(SEEDED);
  }),
);
