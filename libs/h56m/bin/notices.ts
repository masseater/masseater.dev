import { NodeServices } from "@effect/platform-node";
import { runMain } from "@effect/platform-node/NodeRuntime";
import { Array as Arr, Effect, FileSystem, Path, Schema, pipe } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { H56mError } from "#/shared/lib/errors.ts";

const RULES_CRATE = "kingfisher-rules";
const OUTPUT = "THIRD-PARTY-NOTICES.txt";

const CratePackage = Schema.Struct({ name: Schema.String, manifest_path: Schema.String });
const Metadata = Schema.fromJsonString(Schema.Struct({ packages: Schema.Array(CratePackage) }));

const notices = Effect.gen(function* notices() {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const packageDir = path.resolve(import.meta.dirname, "..");
  const metadata = yield* spawner.string(
    ChildProcess.make(
      "cargo",
      [
        "metadata",
        "--format-version",
        "1",
        "--locked",
        "--manifest-path",
        "native/core/Cargo.toml",
      ],
      { cwd: packageDir },
    ),
  );
  const { packages } = yield* Schema.decodeEffect(Metadata)(metadata);
  const rules = yield* pipe(
    packages,
    Arr.findFirst(({ name }) => name === RULES_CRATE),
    Effect.fromOption,
    Effect.mapError(() => H56mError.make({ message: `${RULES_CRATE} is not a dependency` })),
  );
  const source = path.join(path.dirname(rules.manifest_path), "generated", "NOTICES.txt");
  yield* fileSystem.copyFile(source, path.join(packageDir, OUTPUT));
});

runMain(notices.pipe(Effect.provide(NodeServices.layer)));
