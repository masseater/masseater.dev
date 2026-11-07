import { and, eq, max } from "drizzle-orm";
import { Array as Arr, Boolean, Effect, Option, pipe, Struct } from "effect";

import type { VideoDetail } from "#/entities/catalog";
import { catalogDb, getVideo, part, partStaff } from "#/entities/catalog/index.server";

import { personByName, songByTitle, videoByTitle } from "./resolve.server";
import { ToolError } from "./tool-error";
import type { PartInput, UpdatePartInput, VideoPartsInput } from "./tool-input";
import { orMissing, query } from "./tool-result.server";

type Part = typeof PartInput.Type;
type StaffRole = "audio" | "video";

const VIDEO_MISSING = "video not found";
const PART_MISSING = "part not found";
const NO_MATERIAL = "each part needs a song, a quoted video or a label";
const FIRST_POSITION = 1;
const NO_PARTS = 0;
const PART_FIELDS = ["label", "bpm", "bars", "startSec", "endSec", "note", "comment"] as const;

const videoDetail = (id: number): Effect.Effect<VideoDetail, ToolError> =>
  getVideo(id).pipe(orMissing(VIDEO_MISSING));

const referenceId = (
  reference: Readonly<{
    id: number | undefined;
    name: string | undefined;
    resolve: (name: string) => Effect.Effect<number, ToolError>;
  }>,
): Effect.Effect<Option.Option<number>, ToolError> =>
  Option.fromUndefinedOr(reference.id).pipe(
    Option.match({
      onSome: (id) => Effect.succeedSome(id),
      onNone: () =>
        Option.fromUndefinedOr(reference.name).pipe(
          Option.match({
            onNone: () => Effect.succeedNone,
            onSome: (name) => reference.resolve(name).pipe(Effect.asSome),
          }),
        ),
    }),
  );

const materialOf = Effect.fn("mcp.part.material")(function* materialOf(input: Part) {
  const songId = yield* referenceId({
    id: input.songId,
    name: input.songTitle,
    resolve: songByTitle,
  });
  const refVideoId = yield* referenceId({
    id: input.refVideoId,
    name: input.refVideoTitle,
    resolve: videoByTitle,
  });
  return { songId: Option.getOrNull(songId), refVideoId: Option.getOrNull(refVideoId) };
});

const insertStaff = Effect.fn("mcp.part.staff")(function* insertStaff(
  staff: Readonly<{ partId: number; role: StaffRole; names: readonly string[] }>,
) {
  yield* query(() =>
    catalogDb
      .delete(partStaff)
      .where(and(eq(partStaff.partId, staff.partId), eq(partStaff.role, staff.role))),
  );
  const personIds = yield* pipe(staff.names, Effect.forEach(personByName));
  yield* pipe(
    personIds,
    Effect.forEach((personId) =>
      query(() =>
        catalogDb
          .insert(partStaff)
          .values({ partId: staff.partId, personId, role: staff.role })
          .onConflictDoNothing(),
      ),
    ),
  );
});

const replaceStaff = (
  staff: Readonly<{ partId: number; role: StaffRole; names: readonly string[] | undefined }>,
): Effect.Effect<unknown, ToolError> =>
  Option.fromUndefinedOr(staff.names).pipe(
    Option.match({
      onNone: () => Effect.void,
      onSome: (names) => insertStaff({ partId: staff.partId, role: staff.role, names }),
    }),
  );

const replaceAllStaff = (partId: number, input: Part): Effect.Effect<unknown, ToolError> =>
  Effect.all([
    replaceStaff({ partId, role: "audio", names: input.audioStaff }),
    replaceStaff({ partId, role: "video", names: input.videoStaff }),
  ]);

const insertPart = Effect.fn("mcp.part.insert")(function* insertPart(
  placed: Readonly<{ videoId: number; position: number; input: Part }>,
) {
  const material = yield* materialOf(placed.input);
  const fields = Struct.pick(placed.input, PART_FIELDS);
  if (material.songId === null && material.refVideoId === null && !("label" in fields)) {
    return yield* ToolError.make({ message: NO_MATERIAL });
  }
  const created = yield* query(() =>
    catalogDb
      .insert(part)
      .values({ ...fields, ...material, videoId: placed.videoId, position: placed.position })
      .returning({ id: part.id })
      .get(),
  );
  yield* replaceAllStaff(created.id, placed.input);
  return created.id;
});

const insertParts = (
  placing: Readonly<{ videoId: number; after: number; parts: readonly Part[] }>,
): Effect.Effect<unknown, ToolError> =>
  pipe(
    placing.parts,
    Effect.forEach((input, index) =>
      insertPart({
        videoId: placing.videoId,
        position: placing.after + index + FIRST_POSITION,
        input,
      }),
    ),
  );

const setVideoParts = Effect.fn("mcp.parts.set")(function* setVideoParts(
  input: typeof VideoPartsInput.Type,
) {
  yield* videoDetail(input.videoId);
  yield* query(() => catalogDb.delete(part).where(eq(part.videoId, input.videoId)));
  yield* insertParts({ videoId: input.videoId, after: NO_PARTS, parts: input.parts });
  return yield* videoDetail(input.videoId);
});

const addParts = Effect.fn("mcp.parts.add")(function* addParts(input: typeof VideoPartsInput.Type) {
  yield* videoDetail(input.videoId);
  const last = yield* query(() =>
    catalogDb
      .select({ position: max(part.position) })
      .from(part)
      .where(eq(part.videoId, input.videoId))
      .get(),
  );
  const after = Option.fromUndefinedOr(last).pipe(
    Option.flatMap(({ position }) => Option.fromNullOr(position)),
    Option.getOrElse(() => NO_PARTS),
  );
  yield* insertParts({ videoId: input.videoId, after, parts: input.parts });
  return yield* videoDetail(input.videoId);
});

const changedMaterial = Effect.fn("mcp.part.changedMaterial")(function* changedMaterial(
  input: Part,
) {
  const material = yield* materialOf(input);
  const song = Boolean.match("songId" in input || "songTitle" in input, {
    onFalse: () => ({}),
    onTrue: () => ({ songId: material.songId }),
  });
  const refVideo = Boolean.match("refVideoId" in input || "refVideoTitle" in input, {
    onFalse: () => ({}),
    onTrue: () => ({ refVideoId: material.refVideoId }),
  });
  return { ...song, ...refVideo };
});

const updatePart = Effect.fn("mcp.part.update")(function* updatePart(
  input: typeof UpdatePartInput.Type,
) {
  const found = yield* query(() =>
    catalogDb.select({ videoId: part.videoId }).from(part).where(eq(part.id, input.partId)).get(),
  );
  const { videoId } = yield* Effect.succeed(Option.fromUndefinedOr(found)).pipe(
    orMissing(PART_MISSING),
  );
  const patch = { ...Struct.pick(input, PART_FIELDS), ...(yield* changedMaterial(input)) };
  if (Arr.isReadonlyArrayNonEmpty(Struct.keys(patch))) {
    yield* query(() => catalogDb.update(part).set(patch).where(eq(part.id, input.partId)));
  }
  yield* replaceAllStaff(input.partId, input);
  return yield* videoDetail(videoId);
});

const deletePart = Effect.fn("mcp.part.delete")(function* deletePart(partId: number) {
  const deleted = yield* query(() =>
    catalogDb.delete(part).where(eq(part.id, partId)).returning({ id: part.id }).get(),
  );
  return yield* Effect.succeed(Option.fromUndefinedOr(deleted)).pipe(orMissing(PART_MISSING));
});

export { addParts, deletePart, setVideoParts, updatePart };
