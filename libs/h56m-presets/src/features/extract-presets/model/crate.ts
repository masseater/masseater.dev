import { Array as Arr, Effect, Path, Schema, pipe } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { ExtractFailed } from "./errors.ts";

const RULES_CRATE = "kingfisher-rules";

const CratePackage = Schema.Struct({ name: Schema.String, manifest_path: Schema.String });
const Metadata = Schema.fromJsonString(Schema.Struct({ packages: Schema.Array(CratePackage) }));

const metadataOf = Effect.fn("h56m-presets.cargo-metadata")(function* metadataOf(manifest: string) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const json = yield* spawner
    .string(
      ChildProcess.make("cargo", [
        "metadata",
        "--format-version",
        "1",
        "--locked",
        "--manifest-path",
        manifest,
      ]),
    )
    .pipe(
      Effect.mapError((cause) =>
        ExtractFailed.make({ message: `cargo metadata: ${cause.message}` }),
      ),
    );
  return yield* Schema.decodeEffect(Metadata)(json).pipe(
    Effect.mapError((cause) => ExtractFailed.make({ message: `cargo metadata: ${cause.message}` })),
  );
});

/** @internal */
export const rulesCrateDirectory = Effect.fn("h56m-presets.rules-crate")(
  function* rulesCrateDirectory(manifest: string) {
    const path = yield* Path.Path;
    const { packages } = yield* metadataOf(manifest);
    const crate = yield* pipe(
      packages,
      Arr.findFirst(({ name }) => name === RULES_CRATE),
      Effect.fromOption,
      Effect.mapError(() => ExtractFailed.make({ message: `${RULES_CRATE} is not in Cargo.lock` })),
    );
    return path.dirname(crate.manifest_path);
  },
);
