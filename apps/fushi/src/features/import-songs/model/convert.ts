import { alsToFumx } from "@masseater.dev/song-format/convert-als";
import { midiToFumx } from "@masseater.dev/song-format/convert-midi";
import { Array as Arr, Effect, Option, Schema, String as Str, pipe } from "effect";

import type { Song } from "#/entities/library/index.ts";
import { parsedSongOf } from "#/entities/song/index.ts";
import { LABELS } from "#/shared/config/index.ts";

const taggedError = Schema.TaggedError;

export class UnreadableFile extends taggedError<
  UnreadableFile,
  { readonly brand: unique symbol }
>()(
  "UnreadableFile",
  { file: Schema.String, message: Schema.String },
  { identifier: "UnreadableFile" },
) {}

export const ACCEPTED = ".als,.mid,.midi,.fumx";

export type DroppedFile = Readonly<{ name: string; bytes: Uint8Array }>;

const DOT = ".";

const START = 0;

const titleOf = (file: string): string =>
  pipe(
    Str.lastIndexOf(DOT)(file),
    Option.match({ onNone: () => file, onSome: (dot) => Str.slice(START, dot)(file) }),
  );

type Reason = Readonly<{ message: string }>;

type Converter = (
  input: Readonly<{ bytes: Uint8Array; title: string }>,
) => Effect.Effect<string, Reason>;

const CONVERTERS: readonly (readonly [string, Converter])[] = [
  [".als", (input) => alsToFumx(input).pipe(Effect.map((written) => written.text))],
  [".mid", (input) => midiToFumx(input).pipe(Effect.map((written) => written.text))],
  [".midi", (input) => midiToFumx(input).pipe(Effect.map((written) => written.text))],
  [".fumx", ({ bytes }) => Effect.succeed(new TextDecoder().decode(bytes))],
];

const failed =
  (file: string) =>
  ({ message }: Reason): UnreadableFile =>
    UnreadableFile.make({ file, message });

const converterOf = (file: string): Option.Option<Converter> =>
  pipe(
    CONVERTERS,
    Arr.findFirst(([extension]) => Str.endsWith(extension)(Str.toLowerCase(file))),
    Option.map(([, convert]) => convert),
  );

const fumxOf = (file: DroppedFile, title: string): Effect.Effect<string, UnreadableFile> =>
  Option.match(converterOf(file.name), {
    onNone: () => Effect.fail(failed(file.name)({ message: LABELS.unknownFile })),
    onSome: (convert) =>
      convert({ bytes: file.bytes, title }).pipe(Effect.mapError(failed(file.name))),
  });

const checked =
  (file: string) =>
  (fumx: string, name: string): Effect.Effect<void, UnreadableFile> =>
    parsedSongOf({ name, fumx }).pipe(
      Effect.filterOrFail(Option.isSome, () => failed(file)({ message: LABELS.unreadableFumx })),
      Effect.asVoid,
    );

export type SongSeed = Readonly<{ id: string; style: string; imported: string }>;

export const songOf =
  (seed: SongSeed) =>
  (file: DroppedFile): Effect.Effect<Song, UnreadableFile> => {
    const name = titleOf(file.name);
    return fumxOf(file, name).pipe(
      Effect.tap((fumx) => checked(file.name)(fumx, name)),
      Effect.map((fumx) => ({
        id: seed.id,
        style: seed.style,
        imported: seed.imported,
        name,
        file: file.name,
        fumx,
      })),
    );
  };
