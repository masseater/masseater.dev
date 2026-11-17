#!/usr/bin/env node
import { runMain } from "@masseater.dev/node-main";
import { Console, Effect, FileSystem, Option, Path, Schema } from "effect";
import { Argument, Command, Flag } from "effect/cli";

import { convertMidiFile } from "#/app/midi-to-fumx.ts";

const INDENT = 2;

const taggedError = Schema.TaggedError;

class Mismatch extends taggedError<Mismatch, { readonly brand: unique symbol }>()(
  "Mismatch",
  { message: Schema.String },
  { identifier: "Mismatch" },
) {}

const encodeSummary = Schema.encodeUnknownEffect(
  Schema.fromJsonString(Schema.Unknown, { space: INDENT }),
);

interface Paths {
  readonly file: string;
  readonly out: Option.Option<string>;
}

const convertFile = Effect.fn("convertFile")(function* convertFile(paths: Paths) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const input = path.resolve(paths.file);
  const parsed = path.parse(input);
  const target = Option.match(paths.out, {
    onNone: () => path.join(parsed.dir, `${parsed.name}.fumx`),
    onSome: (given) => path.resolve(given),
  });
  const bytes = yield* fileSystem.readFile(input);
  const converted = yield* convertMidiFile({ bytes, title: parsed.name, path: target });
  yield* fileSystem.writeFileString(target, converted.text);
  return { output: target, comparison: converted.comparison, adjustments: converted.adjustments };
});

const command = Command.make(
  "midi-to-fumx",
  {
    file: Argument.String("file").pipe(Argument.withDescription("A Standard MIDI File (.mid)")),
    out: Flag.String("out").pipe(
      Flag.withDescription(
        "Where to write the .fumx file; defaults to the MIDI file's name with .fumx",
      ),
      Flag.optional,
    ),
  },
  ({ file, out }) =>
    convertFile({ file, out }).pipe(
      Effect.tap((summary) => Effect.flatMap(encodeSummary(summary), Console.log)),
      Effect.filterOrFail(
        (summary) => summary.comparison.matches,
        () => Mismatch.make({ message: "The written .fumx does not reproduce every MIDI event" }),
      ),
      Effect.asVoid,
    ),
);

runMain("midi-to-fumx")(Command.run(command, { version: "0.0.0" }));
