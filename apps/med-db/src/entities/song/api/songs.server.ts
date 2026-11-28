import { countDistinct, isNotNull } from "drizzle-orm";
import { Array, Effect, Order, pipe } from "effect";
import type { Option } from "effect";

import { NO_ROWS, fromCatalog, keyOrAliasMatches } from "#/shared/db/index.server.ts";
import { part } from "#/shared/db/index.ts";

const byUsesDescending = Order.flip(
  Order.mapInput(Order.Number, ({ useCount }: Readonly<{ useCount: number }>) => useCount),
);

export const listSongs = Effect.fn("catalog.songs")(function* listSongs(
  keyword: Option.Option<string>,
) {
  const where = keyOrAliasMatches(keyword);
  const [songs, counts] = yield* Effect.all(
    [
      fromCatalog((db) =>
        db.query.song.findMany({
          columns: { id: true, title: true, artist: true },
          where,
          orderBy: { title: "asc" },
        }),
      ),
      fromCatalog((db) =>
        db
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
