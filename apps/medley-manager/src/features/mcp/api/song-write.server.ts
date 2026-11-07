import { and, eq } from "drizzle-orm";
import { Array as Arr, Effect, Option, pipe, Struct } from "effect";

import type { SongDetail } from "#/entities/catalog";
import { catalogDb, getSong, part, song, songAlias } from "#/entities/catalog/index.server";

import { ToolError } from "./tool-error";
import type { CreateSongInput, MergeInput, SongAliasInput, UpdateSongInput } from "./tool-input";
import { orMissing, query } from "./tool-result.server";

const SONG_MISSING = "song not found";
const SAME_SONG = "sourceId and targetId must differ";

const songDetail = (id: number): Effect.Effect<SongDetail, ToolError> =>
  getSong(id).pipe(orMissing(SONG_MISSING));

const addAliases = (
  songId: number,
  aliases: readonly string[],
): Effect.Effect<unknown, ToolError> =>
  pipe(
    aliases,
    Effect.forEach((alias) =>
      query(() => catalogDb.insert(songAlias).values({ songId, alias }).onConflictDoNothing()),
    ),
  );

const createSong = Effect.fn("mcp.song.create")(function* createSong(
  input: typeof CreateSongInput.Type,
) {
  const { aliases, ...fields } = input;
  const created = yield* query(() =>
    catalogDb.insert(song).values(fields).returning({ id: song.id }).get(),
  );
  yield* addAliases(
    created.id,
    Option.getOrElse(Option.fromUndefinedOr(aliases), () => []),
  );
  return yield* songDetail(created.id);
});

const updateSong = Effect.fn("mcp.song.update")(function* updateSong(
  input: typeof UpdateSongInput.Type,
) {
  const { id, ...patch } = input;
  if (Arr.isReadonlyArrayNonEmpty(Struct.keys(patch))) {
    yield* query(() => catalogDb.update(song).set(patch).where(eq(song.id, id)));
  }
  return yield* songDetail(id);
});

const deleteSong = Effect.fn("mcp.song.delete")(function* deleteSong(id: number) {
  const deleted = yield* query(() =>
    catalogDb.delete(song).where(eq(song.id, id)).returning({ id: song.id }).get(),
  );
  return yield* Effect.succeed(Option.fromUndefinedOr(deleted)).pipe(orMissing(SONG_MISSING));
});

const addSongAlias = Effect.fn("mcp.song.alias.add")(function* addSongAlias(
  input: typeof SongAliasInput.Type,
) {
  yield* addAliases(input.songId, [input.alias]);
  return yield* songDetail(input.songId);
});

const removeSongAlias = Effect.fn("mcp.song.alias.remove")(function* removeSongAlias(
  input: typeof SongAliasInput.Type,
) {
  yield* query(() =>
    catalogDb
      .delete(songAlias)
      .where(and(eq(songAlias.songId, input.songId), eq(songAlias.alias, input.alias))),
  );
  return yield* songDetail(input.songId);
});

const mergeSongs = Effect.fn("mcp.song.merge")(function* mergeSongs(input: typeof MergeInput.Type) {
  if (input.sourceId === input.targetId) {
    return yield* ToolError.make({ message: SAME_SONG });
  }
  const source = yield* songDetail(input.sourceId);
  yield* songDetail(input.targetId);
  yield* query(() =>
    catalogDb.update(part).set({ songId: input.targetId }).where(eq(part.songId, input.sourceId)),
  );
  yield* addAliases(input.targetId, [source.title, ...source.aliases]);
  yield* query(() => catalogDb.delete(song).where(eq(song.id, input.sourceId)));
  return yield* songDetail(input.targetId);
});

export { addSongAlias, createSong, deleteSong, mergeSongs, removeSongAlias, updateSong };
