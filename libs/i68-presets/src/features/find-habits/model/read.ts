import { readSong } from "@r_masseater/fumx-parser";
import { soundingsOf } from "@r_masseater/fumx-parser/analysis";
import { Effect, Schema } from "effect";

import { progressionOf } from "#/shared/lib/degrees.ts";

import type { StyleSong } from "./habits.ts";

const taggedError = Schema.TaggedError;

export class UnreadableSong extends taggedError<
  UnreadableSong,
  { readonly brand: unique symbol }
>()("UnreadableSong", { message: Schema.String }, { identifier: "UnreadableSong" }) {}

export interface SongText {
  readonly name: string;
  readonly text: string;
}

export const styleSongFromText = Effect.fn("styleSongFromText")(function* styleSongFromText({
  name,
  text,
}: SongText) {
  const source = yield* readSong({ path: `/${name}.fumx`, read: () => Effect.succeed(text) });
  if (source.status === "invalid") {
    return yield* UnreadableSong.make({ message: `${name} is not a song i68 can read` });
  }
  const song: StyleSong = {
    name,
    steps: progressionOf(soundingsOf(source.song))(source.song),
  };
  return song;
});
