import { and, eq, isNull } from "drizzle-orm";
import { Array as Arr, Effect, Option, Struct } from "effect";

import type { VideoDetail } from "#/entities/catalog";
import { catalogDb, getVideo, part, video } from "#/entities/catalog/index.server";

import type { ToolError } from "./tool-error";
import type { CreateVideoInput, UpdateVideoInput } from "./tool-input";
import { orMissing, query } from "./tool-result.server";

const VIDEO_MISSING = "video not found";
const WATCH_URL =
  /nicovideo\.jp\/watch\/(?<niconico>(?:sm|nm|so)\d+)|(?:youtu\.be\/|youtube\.com\/watch\?v=)(?<youtube>[\w-]{11})/u;

const videoIdOf = (url: string): Option.Option<string> =>
  Option.fromNullOr(WATCH_URL.exec(url)).pipe(
    Option.flatMap(({ groups }) => Option.fromUndefinedOr(groups)),
    Option.flatMap(({ niconico, youtube }) =>
      Option.fromUndefinedOr(niconico).pipe(Option.orElse(() => Option.fromUndefinedOr(youtube))),
    ),
  );

const videoDetail = (id: number): Effect.Effect<VideoDetail, ToolError> =>
  getVideo(id).pipe(orMissing(VIDEO_MISSING));

const createVideo = Effect.fn("mcp.video.create")(function* createVideo(
  input: typeof CreateVideoInput.Type,
) {
  const videoId = Option.fromUndefinedOr(input.videoId).pipe(
    Option.orElse(() => videoIdOf(input.url)),
    Option.getOrNull,
  );
  const created = yield* query(() =>
    catalogDb
      .insert(video)
      .values({ ...input, videoId })
      .returning({ id: video.id })
      .get(),
  );
  return yield* videoDetail(created.id);
});

const derivedVideoId = (input: typeof UpdateVideoInput.Type): Readonly<{ videoId?: string }> =>
  Option.fromUndefinedOr(input.url).pipe(
    Option.filter(() => !("videoId" in input)),
    Option.flatMap(videoIdOf),
    Option.match({ onNone: () => ({}), onSome: (videoId) => ({ videoId }) }),
  );

const updateVideo = Effect.fn("mcp.video.update")(function* updateVideo(
  input: typeof UpdateVideoInput.Type,
) {
  const { id, ...fields } = input;
  const patch = { ...fields, ...derivedVideoId(input) };
  if (Arr.isReadonlyArrayNonEmpty(Struct.keys(patch))) {
    yield* query(() => catalogDb.update(video).set(patch).where(eq(video.id, id)));
  }
  return yield* videoDetail(id);
});

const deleteVideo = Effect.fn("mcp.video.delete")(function* deleteVideo(id: number) {
  yield* query(() =>
    catalogDb
      .delete(part)
      .where(and(eq(part.refVideoId, id), isNull(part.songId), isNull(part.label))),
  );
  const deleted = yield* query(() =>
    catalogDb.delete(video).where(eq(video.id, id)).returning({ id: video.id }).get(),
  );
  return yield* Effect.succeed(Option.fromUndefinedOr(deleted)).pipe(orMissing(VIDEO_MISSING));
});

export { createVideo, deleteVideo, updateVideo };
