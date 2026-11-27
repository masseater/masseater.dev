import { runMain } from "@effect/platform-node/NodeRuntime";
import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { alsToFumx } from "@masseater.dev/song-format/convert-als";
import { Console, Effect, FileSystem, Path, Schema, String as Str } from "effect";
import { Argument, Command, Flag } from "effect/cli";

import { genreFileOf } from "#/features/build-style-table/index.ts";
import BACH_CHORALES from "#/features/check-style/data/bach-chorales.json" with { type: "json" };
import { DEFAULT_LIMITS, habitsOf, styleSongFromText } from "#/features/find-habits/index.ts";
import { tableCache } from "#/shared/lib/cache.ts";
import { StyleTableSchema } from "#/shared/lib/style-table.ts";

const INDENT = 2;

const encodeJson = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown, { space: INDENT }));

const BACH = "bach";
const MIN_FILES = 1;

const decodeTable = Schema.decodeUnknownEffect(Schema.fromJsonString(StyleTableSchema));

const baselineOf = Effect.fn("baselineOf")(function* baselineOf(name: string) {
  if (name === BACH) {
    return BACH_CHORALES;
  }
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const cache = yield* tableCache();
  const text = yield* fileSystem.readFileString(path.join(cache, genreFileOf(name)));
  return yield* decodeTable(text);
});

const textOf = Effect.fn("textOf")(function* textOf(file: string, name: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  if (Str.endsWith(".als")(file)) {
    const bytes = yield* fileSystem.readFile(file);
    const fumx = yield* alsToFumx({ bytes, title: name });
    return fumx.text;
  }
  return yield* fileSystem.readFileString(file);
});

const styleSongOf = Effect.fn("styleSongOf")(function* styleSongOf(file: string) {
  const path = yield* Path.Path;
  const { name } = path.parse(file);
  const text = yield* textOf(file, name);
  return yield* styleSongFromText({ name, text });
});

const command = Command.make(
  "find-habits",
  {
    files: Argument.String("file").pipe(
      Argument.withDescription("Songs of one style, as .fumx or Ableton Live Sets (.als)"),
      Argument.atLeast(MIN_FILES),
    ),
    songs: Flag.Int("songs").pipe(
      Flag.withDescription("How many songs a change must appear in"),
      Flag.withDefault(DEFAULT_LIMITS.songs),
    ),
    share: Flag.Finite("share").pipe(
      Flag.withDescription("How often the songs must make the change after its context"),
      Flag.withDefault(DEFAULT_LIMITS.share),
    ),
    against: Flag.String("against").pipe(
      Flag.withDescription(
        "The baseline: bach, or a Chordonomicon genre table built by build-genre-tables (all, pop, rock, ...)",
      ),
      Flag.withDefault("all"),
    ),
    baseline: Flag.Finite("baseline").pipe(
      Flag.withDescription("Below which share of the baseline a change counts as unusual"),
      Flag.withDefault(DEFAULT_LIMITS.baseline),
    ),
    seen: Flag.Int("seen").pipe(
      Flag.withDescription("How often the baseline must have seen a context to judge it"),
      Flag.withDefault(DEFAULT_LIMITS.seen),
    ),
  },
  ({ files, against, songs, share, baseline, seen }) =>
    Effect.gen(function* find() {
      const table = yield* baselineOf(against);
      const read = yield* Effect.forEach(files, (file) => styleSongOf(file), { concurrency: 1 });
      const habits = habitsOf({
        songs: read,
        baseline: table,
        limits: { songs, share, baseline, seen },
      });
      const json = yield* encodeJson({ baseline: table.name, habits });
      yield* Console.log(json);
    }),
);

runMain(Command.run(command, { version: "0.0.0" }).pipe(Effect.provide(nodeServices)));
