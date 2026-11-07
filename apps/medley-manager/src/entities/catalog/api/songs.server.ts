import { countDistinct, isNotNull } from "drizzle-orm";
import { Array, Effect, Option, Order, pipe } from "effect";

import { part } from "#/entities/catalog/model/part.table";

import { NO_ROWS, catalogDb, containing } from "./db.server";

const byUsesDescending = Order.flip(
  Order.mapInput(Order.Number, ({ useCount }: Readonly<{ useCount: number }>) => useCount),
);

const listSongs = Effect.fn("catalog.songs")(function* listSongs(keyword: Option.Option<string>) {
  const where = keyword.pipe(
    Option.match({
      onNone: () => ({}),
      onSome: (value) => ({
        OR: [
          { title: { like: containing(value) } },
          { artist: { like: containing(value) } },
          { aliases: { alias: { like: containing(value) } } },
        ],
      }),
    }),
  );
  const [songs, counts] = yield* Effect.all(
    [
      Effect.promise(() =>
        catalogDb.query.song.findMany({
          columns: { id: true, title: true, artist: true },
          where,
          orderBy: { title: "asc" },
        }),
      ),
      Effect.promise(() =>
        catalogDb
          .select({ songId: part.songId, uses: countDistinct(part.videoId) })
          .from(part)
          .where(isNotNull(part.songId))
          .groupBy(part.songId),
      ),
    ],
    { concurrency: "unbounded" },
  );
  const uses = new Map(
    pipe(
      counts,
      Array.map((row) => [row.songId, row.uses]),
    ),
  );
  return pipe(
    songs,
    Array.map((song) => Object.assign(song, { useCount: uses.get(song.id) ?? NO_ROWS })),
    (rows) => Array.sort(rows, byUsesDescending),
  );
});

export { listSongs };
