import { output, run } from "@masseater.dev/component-release";
import { runMain } from "@r_masseater/node-main";
import { Array as Arr, Effect, Schema, pipe } from "effect";

const CrateDependency = Schema.Struct({ name: Schema.String });
const CratePackage = Schema.Struct({ dependencies: Schema.Array(CrateDependency) });
const Metadata = Schema.fromJsonString(Schema.Struct({ packages: Schema.Array(CratePackage) }));

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
    const selected = pipe(
      crates,
      Arr.flatMap((crate) => ["-p", crate]),
    );
    yield* run({ file: "cargo", args: ["build", "--release", "--locked", ...selected] });
  }),
);
