#!/usr/bin/env node
import { Array as Arr, Console, Effect, FileSystem, Path, Schema, pipe } from "effect";
import { Argument, Command } from "effect/cli";

import { runWithNode } from "#/app/node-services.ts";
import { AnalysisSchema, analyze } from "#/features/analyze/index.ts";
import { readSong } from "#/features/read-song/index.ts";

const INDENT = 2;

const encodeReport = Schema.encodeUnknownEffect(
  Schema.fromJsonString(AnalysisSchema, { space: INDENT }),
);

const taggedError = Schema.TaggedError;

class InvalidSong extends taggedError<InvalidSong, { readonly brand: unique symbol }>()(
  "InvalidSong",
  { message: Schema.String },
  { identifier: "InvalidSong" },
) {}

const command = Command.make(
  "song-report",
  {
    file: Argument.String("file").pipe(
      Argument.withDescription(
        "A .fu file; reads the files it imports and prints the keys, chords and repeated bars read from its notes",
      ),
    ),
  },
  ({ file }) =>
    Effect.gen(function* report() {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const source = yield* readSong({
        path: path.resolve(file),
        read: (target) => fileSystem.readFileString(target),
      });
      if (source.status === "invalid") {
        const lines = pipe(
          source.issues,
          Arr.map(
            (issue) =>
              `${issue.path}:${String(issue.line)}:${String(issue.column)} ${issue.message}`,
          ),
        );
        return yield* InvalidSong.make({ message: Arr.join(lines, "\n") });
      }
      const encoded = yield* encodeReport(analyze(source.song));
      return yield* Console.log(encoded);
    }),
);

runWithNode(Command.run(command, { version: "0.0.0" }));
