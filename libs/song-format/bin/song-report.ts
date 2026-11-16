#!/usr/bin/env node
import { Console, Effect, FileSystem, Schema } from "effect";
import { Argument, Command } from "effect/cli";

import { AnalysisSchema, analyze } from "#/analysis.ts";
import { runWithNode } from "#/node-services.ts";
import { SongSchema } from "#/song.ts";

const INDENT = 2;

const decodeSong = Schema.decodeUnknownEffect(Schema.fromJsonString(SongSchema));

const encodeReport = Schema.encodeUnknownEffect(
  Schema.fromJsonString(AnalysisSchema, { space: INDENT }),
);

const command = Command.make(
  "song-report",
  {
    file: Argument.String("file").pipe(
      Argument.withDescription(
        "A song file; prints the keys, chords and repeated bars read from its notes",
      ),
    ),
  },
  ({ file }) =>
    Effect.gen(function* report() {
      const fileSystem = yield* FileSystem.FileSystem;
      const text = yield* fileSystem.readFileString(file);
      const song = yield* decodeSong(text);
      const json = yield* encodeReport(analyze(song));
      yield* Console.log(json);
    }),
);

runWithNode(Command.run(command, { version: "0.0.0" }));
