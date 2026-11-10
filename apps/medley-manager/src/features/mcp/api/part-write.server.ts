import { and, eq, max } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { Array as Arr, Boolean, Effect, Option, pipe, Struct } from "effect";

import type { VideoDetail } from "#/entities/catalog";
import { catalogDb, getVideo, part, partStaff } from "#/entities/catalog/index.server";

import { personByName, songByTitle, videoByTitle } from "./resolve.server";
import { ToolError } from "./tool-error";
import type { PartInput, UpdatePartInput, VideoPartsInput } from "./tool-input";
import { orMissing, query } from "./tool-result.server";

type Part = typeof PartInput.Type;
type StaffRole = "audio" | "video";
type Staffing = Readonly<{ role: StaffRole; personIds: readonly number[] }>;
type Member = Readonly<{ role: StaffRole; personId: number }>;
type Last = Readonly<{ last: number | null }>;
type Placing = Readonly<{
  videoId: number;
  lastId: number;
  lastPosition: number;
  parts: readonly Prepared[];
}>;
type Material = Readonly<{ songId: number | null; refVideoId: number | null }>;
type Prepared = Readonly<{
  values: Material & Pick<Part, (typeof PART_FIELDS)[number]>;
  staff: readonly Staffing[];
}>;
type Statement = BatchItem<"sqlite">;

const VIDEO_MISSING = "video not found";
const PART_MISSING = "part not found";
const NO_MATERIAL = "each part needs a song, a quoted video or a label";
const NEXT = 1;
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

const staffingOf = (
  role: StaffRole,
  names: readonly string[] | undefined,
): Effect.Effect<readonly Staffing[], ToolError> =>
  Option.fromUndefinedOr(names).pipe(
    Option.match({
      onNone: () => Effect.succeed([]),
      onSome: (given) =>
        pipe(
          given,
          Effect.forEach(personByName),
          Effect.map((personIds) => [{ role, personIds }]),
        ),
    }),
  );

const staffingsOf = (input: Part): Effect.Effect<readonly Staffing[], ToolError> =>
  Effect.all([staffingOf("audio", input.audioStaff), staffingOf("video", input.videoStaff)]).pipe(
    Effect.map(Arr.flatten),
  );

const preparePart = Effect.fn("mcp.part.prepare")(function* preparePart(input: Part) {
  const material = yield* materialOf(input);
  const fields = Struct.pick(input, PART_FIELDS);
  if (material.songId === null && material.refVideoId === null && !("label" in fields)) {
    return yield* ToolError.make({ message: NO_MATERIAL });
  }
  const staff = yield* staffingsOf(input);
  const prepared: Prepared = { values: { ...fields, ...material }, staff };
  return prepared;
});

const prepareParts = (parts: readonly Part[]): Effect.Effect<readonly Prepared[], ToolError> =>
  pipe(parts, Effect.forEach(preparePart));

const membersOf = (staff: readonly Staffing[]): readonly Member[] =>
  pipe(
    staff,
    Arr.flatMap(({ role, personIds }) =>
      pipe(
        personIds,
        Arr.map((personId) => ({ role, personId })),
      ),
    ),
  );

const staffInserts = (partId: number, staff: readonly Staffing[]): readonly Statement[] =>
  pipe(
    membersOf(staff),
    Arr.map((member) =>
      catalogDb
        .insert(partStaff)
        .values({ ...member, partId })
        .onConflictDoNothing(),
    ),
  );

const staffReplacements = (partId: number, staff: readonly Staffing[]): readonly Statement[] => [
  ...pipe(
    staff,
    Arr.map(({ role }) =>
      catalogDb
        .delete(partStaff)
        .where(and(eq(partStaff.partId, partId), eq(partStaff.role, role))),
    ),
  ),
  ...staffInserts(partId, staff),
];

const partInserts = (placing: Placing): readonly Statement[] =>
  pipe(
    placing.parts,
    Arr.flatMap((prepared, index) => {
      const id = placing.lastId + index + NEXT;
      const position = placing.lastPosition + index + NEXT;
      return [
        catalogDb
          .insert(part)
          .values({ ...prepared.values, id, videoId: placing.videoId, position }),
        ...staffInserts(id, prepared.staff),
      ];
    }),
  );

const lastOf = (found: Last | undefined): number =>
  Option.fromUndefinedOr(found).pipe(
    Option.flatMap(({ last }) => Option.fromNullOr(last)),
    Option.getOrElse(() => NO_PARTS),
  );

const lastPartId = query(() =>
  catalogDb
    .select({ last: max(part.id) })
    .from(part)
    .get(),
).pipe(Effect.map(lastOf));

const lastPositionIn = (videoId: number): Effect.Effect<number, ToolError> =>
  query(() =>
    catalogDb
      .select({ last: max(part.position) })
      .from(part)
      .where(eq(part.videoId, videoId))
      .get(),
  ).pipe(Effect.map(lastOf));

const writeAll = (statements: readonly Statement[]): Effect.Effect<unknown, ToolError> =>
  Arr.match(statements, {
    onEmpty: () => Effect.void,
    onNonEmpty: (batch) => query(() => catalogDb.batch(batch)),
  });

const setVideoParts = Effect.fn("mcp.parts.set")(function* setVideoParts(
  input: typeof VideoPartsInput.Type,
) {
  yield* videoDetail(input.videoId);
  const parts = yield* prepareParts(input.parts);
  const lastId = yield* lastPartId;
  yield* query(() =>
    catalogDb.batch([
      catalogDb.delete(part).where(eq(part.videoId, input.videoId)),
      ...partInserts({ videoId: input.videoId, lastId, lastPosition: NO_PARTS, parts }),
    ]),
  );
  return yield* videoDetail(input.videoId);
});

const addParts = Effect.fn("mcp.parts.add")(function* addParts(input: typeof VideoPartsInput.Type) {
  yield* videoDetail(input.videoId);
  const parts = yield* prepareParts(input.parts);
  const lastId = yield* lastPartId;
  const lastPosition = yield* lastPositionIn(input.videoId);
  yield* writeAll(partInserts({ videoId: input.videoId, lastId, lastPosition, parts }));
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
  const staff = yield* staffingsOf(input);
  const partUpdates: readonly Statement[] = Boolean.match(
    Arr.isReadonlyArrayNonEmpty(Struct.keys(patch)),
    {
      onFalse: () => [],
      onTrue: () => [catalogDb.update(part).set(patch).where(eq(part.id, input.partId))],
    },
  );
  yield* writeAll([...partUpdates, ...staffReplacements(input.partId, staff)]);
  return yield* videoDetail(videoId);
});

const deletePart = Effect.fn("mcp.part.delete")(function* deletePart(partId: number) {
  const deleted = yield* query(() =>
    catalogDb.delete(part).where(eq(part.id, partId)).returning({ id: part.id }).get(),
  );
  return yield* Effect.succeed(Option.fromUndefinedOr(deleted)).pipe(orMissing(PART_MISSING));
});

export { addParts, deletePart, setVideoParts, updatePart };
