import { runMain } from "@effect/platform-node/NodeRuntime";
import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { Console, Effect, FileSystem, Path, Schema } from "effect";
import { Argument, Command, Flag } from "effect/cli";

import { genreFileOf } from "#/features/build-style-table/index.ts";
import BACH_CHORALES from "#/features/check-style/data/bach-chorales.json" with { type: "json" };
import { habitsOf, styleSongOf } from "#/features/find-habits/index.ts";
import { tableCache } from "#/shared/lib/cache.ts";
import { StyleTableSchema } from "#/shared/lib/style-table.ts";

const INDENT = 2;

const encodeJson = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown, { space: INDENT }));

const BACH = "bach";
const MIN_FILES = 1;
const DEFAULT_SONGS = 2;
const DEFAULT_SHARE = 0.3;
const DEFAULT_BASELINE = 0.03;
const DEFAULT_SEEN = 8;

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

const command = Command.make(
  "find-habits",
  {
    files: Argument.String("file").pipe(
      Argument.withDescription("Songs of one style, as .fumx or Ableton Live Sets (.als)"),
      Argument.atLeast(MIN_FILES),
    ),
    songs: Flag.Int("songs").pipe(
      Flag.withDescription("How many songs a change must appear in"),
      Flag.withDefault(DEFAULT_SONGS),
    ),
    share: Flag.Finite("share").pipe(
      Flag.withDescription("How often the songs must make the change after its context"),
      Flag.withDefault(DEFAULT_SHARE),
    ),
    against: Flag.String("against").pipe(
      Flag.withDescription(
        "The baseline: bach, or a Chordonomicon genre table built by build-genre-tables (all, pop, rock, ...)",
      ),
      Flag.withDefault("all"),
    ),
    baseline: Flag.Finite("baseline").pipe(
      Flag.withDescription("Below which share of the baseline a change counts as unusual"),
      Flag.withDefault(DEFAULT_BASELINE),
    ),
    seen: Flag.Int("seen").pipe(
      Flag.withDescription("How often the baseline must have seen a context to judge it"),
      Flag.withDefault(DEFAULT_SEEN),
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
