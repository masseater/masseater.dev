import { NodeServices } from "@effect/platform-node";
import { runMain } from "@effect/platform-node/NodeRuntime";
import {
  Array as Arr,
  Console,
  Effect,
  FileSystem,
  Layer,
  Option,
  Path,
  String as Str,
  pipe,
} from "effect";
import { FetchHttpClient } from "effect/http";
import { Otlp, OtlpSerialization } from "effect/observability";
import { ChildProcess, ChildProcessSpawner } from "effect/process";
import { resolveConfigFromFile } from "vite-plus";

import { failedWith } from "#/shared/lib/errors.ts";

import { format, lint } from "./index.ts";
import type { WismConfig } from "./index.ts";
import { wismPathspecs, wismSection } from "./section.ts";

const CONFIG_FILES = ["vite.config.ts", "vite.config.mts", "vite.config.js", "vite.config.mjs"];
const FAILED = 1;

const configOf = Effect.fn("wism.config")(function* configOf(root: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const candidates = pipe(
    CONFIG_FILES,
    Arr.map((name) => path.join(root, name)),
  );
  const found = yield* pipe(
    candidates,
    Effect.filter((file) => fileSystem.exists(file).pipe(Effect.orElseSucceed(() => false))),
  );
  return yield* Option.match(Arr.head(found), {
    onNone: () => Effect.succeed<WismConfig>({}),
    onSome: (file) =>
      Effect.tryPromise({
        try: () => resolveConfigFromFile(file),
        catch: failedWith(`could not load ${file}`),
      }).pipe(Effect.map(wismSection)),
  });
});

const trackedFiles = Effect.fn("wism.files")(function* trackedFiles(
  root: string,
  config: WismConfig,
) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const pathspecs = wismPathspecs(config);
  const output = yield* spawner.string(
    ChildProcess.make("git", ["ls-files", "-co", "--exclude-standard", "-z", "--", ...pathspecs], {
      cwd: root,
    }),
  );
  return pipe(Str.split(output, "\0"), Arr.filter(Str.isNonEmpty));
});

const main = Effect.gen(function* main() {
  const root = process.cwd();
  const config = yield* configOf(root);
  const files = yield* trackedFiles(root, config);
  const diagnostics = yield* lint({ root, files, config });
  yield* Arr.match(diagnostics, {
    onEmpty: () => Effect.void,
    onNonEmpty: (found) => Console.log(pipe(found, Arr.map(format), Arr.join("\n"))),
  });
  yield* Effect.when(
    Effect.sync(() => {
      process.exitCode = FAILED;
    }),
    Effect.sync(() =>
      pipe(
        diagnostics,
        Arr.some(({ severity }) => severity === "error"),
      ),
    ),
  );
});

const services = Otlp.layerFromConfig({ resource: { serviceName: "wism" } }).pipe(
  Layer.provide(OtlpSerialization.layerJson),
  Layer.provide(FetchHttpClient.layer),
  Layer.provideMerge(NodeServices.layer),
);

export const runCli = (): void => {
  runMain(main.pipe(Effect.provide(services)));
};
