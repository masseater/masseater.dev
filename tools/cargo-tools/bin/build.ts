import { output, run } from "@masseater.dev/component-release";
import { runMain } from "@masseater.dev/node-main";
import { Array as Arr, Effect, Schema, pipe } from "effect";

const Metadata = Schema.fromJsonString(
  Schema.Struct({
    packages: Schema.Array(
      Schema.Struct({ dependencies: Schema.Array(Schema.Struct({ name: Schema.String })) }),
    ),
  }),
);

runMain("cargo-tools-build")(
  Effect.gen(function* build() {
    const metadata = yield* output({
      file: "cargo",
      args: ["metadata", "--format-version", "1", "--no-deps", "--locked"],
    }).pipe(Effect.flatMap(Schema.decodeEffect(Metadata)));
    const crates = pipe(
      metadata.packages,
      Arr.flatMap(({ dependencies }) => dependencies),
      Arr.map(({ name }) => name),
      Arr.dedupe,
    );
    yield* run({
      file: "cargo",
      args: ["build", "--release", "--locked", ...Arr.flatMap(crates, (crate) => ["-p", crate])],
    });
  }),
);
