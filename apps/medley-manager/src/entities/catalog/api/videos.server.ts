import { and, countDistinct, eq, like, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { Array, Effect, Option, pipe } from "effect";

import { part } from "#/entities/catalog/model/part.table";
import type { VideoFilter } from "#/entities/catalog/model/video-search";
import { video } from "#/entities/catalog/model/video.table";

import { NO_ROWS, catalogDb, containing, keywordOf } from "./db.server";

const keywordCondition = (filter: VideoFilter): SQL | undefined =>
  keywordOf(filter.keyword).pipe(
    Option.map((value) =>
      or(
        like(video.title, containing(value)),
        like(video.videoId, containing(value)),
        like(video.uploader, containing(value)),
      ),
    ),
    Option.getOrUndefined,
  );

const kindCondition = (filter: VideoFilter): SQL | undefined =>
  Option.fromUndefinedOr(filter.kind).pipe(
    Option.map((kind) => eq(video.kind, kind)),
    Option.getOrUndefined,
  );

const listVideos = Effect.fn("catalog.videos")(function* listVideos(filter: VideoFilter) {
  const [videos, counts] = yield* Effect.all(
    [
      Effect.promise(() =>
        catalogDb
          .select({
            id: video.id,
            title: video.title,
            kind: video.kind,
            uploader: video.uploader,
            publishedAt: video.publishedAt,
            thumbnailUrl: video.thumbnailUrl,
          })
          .from(video)
          .where(and(keywordCondition(filter), kindCondition(filter)))
          .orderBy(video.title),
      ),
      Effect.promise(() =>
        catalogDb
          .select({ videoId: part.videoId, parts: countDistinct(part.id) })
          .from(part)
          .groupBy(part.videoId),
      ),
    ],
    { concurrency: "unbounded" },
  );
  const parts = new Map(
    pipe(
      counts,
      Array.map((row) => [row.videoId, row.parts]),
    ),
  );
  return pipe(
    videos,
    Array.map((row) => Object.assign(row, { partCount: parts.get(row.id) ?? NO_ROWS })),
  );
});

export { listVideos };
