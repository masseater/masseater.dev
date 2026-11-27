import { runMain } from "@masseater.dev/node-main";
import { Console, Effect, FileSystem, Option, Path, Schema } from "effect";
import { Argument, Command, Flag } from "effect/cli";

import type { Converted } from "./round-trip.ts";

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

export interface Source {
  readonly bytes: Uint8Array;
  readonly title: string;
  readonly path: string;
}

export interface ConvertCommand<Failure> {
  readonly name: string;
  readonly input: string;
  readonly source: string;
  readonly convert: (source: Source) => Effect.Effect<Converted, Failure>;
}

export const convertMain = <Failure>(spec: ConvertCommand<Failure>): void => {
  const convertFile = Effect.fn("convertFile")(function* convertFile(
    file: string,
    out: Option.Option<string>,
  ) {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const input = path.resolve(file);
    const parsed = path.parse(input);
    const target = Option.match(out, {
      onNone: () => path.join(parsed.dir, `${parsed.name}.fumx`),
      onSome: (given) => path.resolve(given),
    });
    const bytes = yield* fileSystem.readFile(input);
    const converted = yield* spec.convert({ bytes, title: parsed.name, path: target });
    yield* fileSystem.writeFileString(target, converted.text);
    return { output: target, comparison: converted.comparison, adjustments: converted.adjustments };
  });
  const command = Command.make(
    spec.name,
    {
      file: Argument.String("file").pipe(Argument.withDescription(spec.input)),
      out: Flag.String("out").pipe(
        Flag.withDescription(
          `Where to write the .fumx file; defaults to the ${spec.source}'s name with .fumx`,
        ),
        Flag.optional,
      ),
    },
    ({ file, out }) =>
      convertFile(file, out).pipe(
        Effect.tap((summary) => Effect.flatMap(encodeSummary(summary), Console.log)),
        Effect.filterOrFail(
          (summary) => summary.comparison.matches,
          () =>
            Mismatch.make({
              message: `The written .fumx does not reproduce every event of the ${spec.source}`,
            }),
        ),
        Effect.asVoid,
      ),
  );
  runMain(spec.name)(Command.run(command, { version: "0.0.0" }));
};
