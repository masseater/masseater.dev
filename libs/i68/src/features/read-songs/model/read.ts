import { readSong } from "@r_masseater/fumx-parser";
import type { SongSource } from "@r_masseater/fumx-parser";
import { Effect } from "effect";

import type { I68Error } from "#/shared/lib/errors.ts";

const SEPARATOR = "/";

export interface SongFile {
  readonly file: string;
  readonly source: SongSource;
}

export type Read = (path: string) => Effect.Effect<string, I68Error>;

export interface ReadInput {
  readonly root: string;
  readonly file: string;
  readonly read: Read;
}

export const readSongFile = Effect.fn("i68.read")(function* readSongFile(input: ReadInput) {
  const path = `${input.root}${SEPARATOR}${input.file}`;
  const source = yield* readSong({ path, read: input.read });
  return { file: input.file, source } satisfies SongFile;
});
