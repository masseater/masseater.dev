import { runMain } from "@effect/platform-node/NodeRuntime";
import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { Effect, FileSystem, Path, Record as Rec, Schema, String as Str } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { addonFileOf } from "#/shared/lib/target.ts";

const taggedError = Schema.TaggedError;

class AddonBuildFailed extends taggedError<AddonBuildFailed, { readonly brand: unique symbol }>()(
  "AddonBuildFailed",
  { message: Schema.String },
) {}

const LIBRARY: Readonly<Record<string, (name: string) => string>> = {
  linux: (name) => `lib${name}.so`,
  darwin: (name) => `lib${name}.dylib`,
  win32: (name) => `${name}.dll`,
};

const SUCCESS = 0;

export interface AddonBuild {
  readonly crate: string;
  readonly binary: string;
  readonly packageDir: string;
  readonly workspaceDir: string;
}

const cargo = Effect.fn("cargo")(function* cargo(crate: string, workspace: string) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const exitCode = yield* spawner.exitCode(
    ChildProcess.make("cargo", ["build", "--release", "--locked", "-p", crate], {
      cwd: workspace,
      stdout: "inherit",
      stderr: "inherit",
    }),
  );
  const failure = AddonBuildFailed.make({ message: `cargo exited with ${String(exitCode)}` });
  yield* Effect.when(
    Effect.fail(failure),
    Effect.sync(() => Number(exitCode) !== SUCCESS),
  );
});

const build = Effect.fn("buildAddon")(function* build(options: AddonBuild) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const library = yield* Effect.fromOption(Rec.get(LIBRARY, process.platform)).pipe(
    Effect.mapError(() =>
      AddonBuildFailed.make({ message: `no native build for ${process.platform}` }),
    ),
  );
  yield* cargo(options.crate, options.workspaceDir);
  const output = path.join(options.packageDir, "native");
  yield* fileSystem.makeDirectory(output, { recursive: true });
  const built = library(Str.replaceAll("-", "_")(options.crate));
  yield* fileSystem.copyFile(
    path.join(options.workspaceDir, "target", "release", built),
    path.join(output, addonFileOf(options.binary)),
  );
});

export const buildAddon = (options: AddonBuild): void => {
  runMain(build(options).pipe(Effect.provide(nodeServices)));
};
