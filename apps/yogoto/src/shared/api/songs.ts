import { settled, settledAs } from "@masseater.dev/media-notes-ui";
import type { ApiFailed } from "@masseater.dev/media-notes-ui";
import { JobSchema, ModelInfoSchema, SongSchema } from "@masseater.dev/yogoto-protocol";
import type { Job, ModelInfo, Song } from "@masseater.dev/yogoto-protocol";
import { Effect, Schema } from "effect";

import { commands } from "./generated/bindings.ts";

/** @internal */
export const fetchSongs: Effect.Effect<readonly Song[], ApiFailed> = settledAs(
  Schema.decodeUnknownEffect(Schema.Array(SongSchema)),
)(() => commands.listSongs());

/** @internal */
export const fetchJobs: Effect.Effect<readonly Job[], ApiFailed> = settledAs(
  Schema.decodeUnknownEffect(Schema.Array(JobSchema)),
)(() => commands.listJobs());

/** @internal */
export const fetchModels: Effect.Effect<readonly ModelInfo[], ApiFailed> = settledAs(
  Schema.decodeUnknownEffect(Schema.Array(ModelInfoSchema)),
)(() => commands.listModels());

/** @internal */
export const folderOf = (id: string): Effect.Effect<string, ApiFailed> =>
  settled(() => commands.songFolder(id));

/** @internal */
export const importSong = (location: string): Effect.Effect<string, ApiFailed> =>
  settled(() => commands.importSong({ location, models: [] }));

/** @internal */
export const separateSong =
  (model: string) =>
  (songId: string): Effect.Effect<string, ApiFailed> =>
    settled(() => commands.separateSong({ songId, model }));

/** @internal */
export const chooseAudioFiles: Effect.Effect<readonly string[], ApiFailed> = Effect.suspend(() =>
  settled(() => commands.chooseAudioFiles()),
);
