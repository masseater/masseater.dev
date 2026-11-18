import { settled, settledAs } from "@masseater.dev/media-notes-ui";
import type { ApiFailed } from "@masseater.dev/media-notes-ui";
import { JobSchema, ModelInfoSchema, SongSchema } from "@masseater.dev/yogoto-protocol";
import type { Job, ModelInfo, Song } from "@masseater.dev/yogoto-protocol";
import { Effect, Schema } from "effect";

import { commands } from "./generated/bindings.ts";

/** @internal */
export const fetchSongs: Effect.Effect<readonly Song[], ApiFailed> = settledAs(
  Schema.decodeUnknownEffect(Schema.Array(SongSchema)),
)(() => commands.listSongs()).pipe(Effect.withSpan("songs.list"));

/** @internal */
export const fetchJobs: Effect.Effect<readonly Job[], ApiFailed> = settledAs(
  Schema.decodeUnknownEffect(Schema.Array(JobSchema)),
)(() => commands.listJobs()).pipe(Effect.withSpan("jobs.list"));

/** @internal */
export const fetchModels: Effect.Effect<readonly ModelInfo[], ApiFailed> = settledAs(
  Schema.decodeUnknownEffect(Schema.Array(ModelInfoSchema)),
)(() => commands.listModels()).pipe(Effect.withSpan("models.list"));

/** @internal */
export const folderOf = Effect.fn("songs.folder")(function* folderOf(id: string) {
  return yield* settled(() => commands.songFolder(id));
});

/** @internal */
export const importSong = Effect.fn("songs.import")(function* importSong(location: string) {
  return yield* settled(() => commands.importSong({ location, models: [] }));
});

/** @internal */
export const separateSong = (
  model: string,
): ((songId: string) => Effect.Effect<string, ApiFailed>) =>
  Effect.fn("songs.separate")(function* separate(songId: string) {
    return yield* settled(() => commands.separateSong({ songId, model }));
  });

/** @internal */
export const analyzeSong = Effect.fn("songs.analyze")(function* analyzeSong(songId: string) {
  return yield* settled(() => commands.analyzeSong({ songId }));
});

/** @internal */
export const chooseAudioFiles: Effect.Effect<readonly string[], ApiFailed> = Effect.suspend(() =>
  settled(() => commands.chooseAudioFiles()),
).pipe(Effect.withSpan("songs.choose_files"));
