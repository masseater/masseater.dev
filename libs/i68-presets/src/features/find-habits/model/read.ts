import { alsToFumx } from "@masseater.dev/song-format/convert-als";
import { readSong } from "@r_masseater/fumx-parser";
import { soundingsOf } from "@r_masseater/fumx-parser/analysis";
import { Effect, FileSystem, Path, Schema, String as Str } from "effect";

import { progressionOf } from "#/shared/lib/degrees.ts";

import type { StyleSong } from "./habits.ts";

const taggedError = Schema.TaggedError;

export class UnreadableSong extends taggedError<
  UnreadableSong,
  { readonly brand: unique symbol }
>()("UnreadableSong", { message: Schema.String }, { identifier: "UnreadableSong" }) {}

const textOf = Effect.fn("textOf")(function* textOf(file: string, name: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  if (Str.endsWith(".als")(file)) {
    const bytes = yield* fileSystem.readFile(file);
    const fumx = yield* alsToFumx({ bytes, title: name });
    return fumx.text;
  }
  return yield* fileSystem.readFileString(file);
});

export const styleSongOf = Effect.fn("styleSongOf")(function* styleSongOf(file: string) {
  const path = yield* Path.Path;
  const { name } = path.parse(file);
  const text = yield* textOf(file, name);
  const source = yield* readSong({ path: `${file}.fumx`, read: () => Effect.succeed(text) });
  if (source.status === "invalid") {
    return yield* UnreadableSong.make({ message: `${file} is not a song i68 can read` });
  }
  const song: StyleSong = {
    name,
    steps: progressionOf(soundingsOf(source.song))(source.song),
  };
  return song;
});
