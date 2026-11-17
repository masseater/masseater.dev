import { NodeServices } from "@effect/platform-node";
import { runMain } from "@effect/platform-node/NodeRuntime";
import { Effect, FileSystem, Path, Record as Rec } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { Fu4Error } from "#/shared/lib/errors.ts";
import { addonFile } from "#/shared/native/file.ts";

const LIBRARY: Readonly<Record<string, string>> = {
  linux: "libfu4_node.so",
  darwin: "libfu4_node.dylib",
  win32: "fu4_node.dll",
};

const SUCCESS = 0;

const cargo = Effect.fn("cargo")(function* cargo(workspace: string) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const exitCode = yield* spawner.exitCode(
    ChildProcess.make("cargo", ["build", "--release", "--locked", "-p", "fu4-node"], {
      cwd: workspace,
      stdout: "inherit",
      stderr: "inherit",
    }),
  );
  const failure = Fu4Error.make({ message: `cargo exited with ${String(exitCode)}` });
  yield* Effect.when(
    Effect.fail(failure),
    Effect.sync(() => Number(exitCode) !== SUCCESS),
  );
});

const build = Effect.gen(function* build() {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const library = yield* Effect.fromOption(Rec.get(LIBRARY, process.platform)).pipe(
    Effect.mapError(() => Fu4Error.make({ message: `no native build for ${process.platform}` })),
  );
  const workspace = path.resolve(import.meta.dirname, "..", "..", "..");
  yield* cargo(workspace);
  const output = path.resolve(import.meta.dirname, "..", "native");
  yield* fileSystem.makeDirectory(output, { recursive: true });
  yield* fileSystem.copyFile(
    path.join(workspace, "target", "release", library),
    path.join(output, addonFile),
  );
});

runMain(build.pipe(Effect.scoped, Effect.provide(NodeServices.layer)));
