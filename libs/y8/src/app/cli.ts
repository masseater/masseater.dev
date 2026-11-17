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
import type { Y8Config } from "./index.ts";
import { markdownPathspecs, y8Section } from "./section.ts";

const CONFIG_FILES = ["vite.config.ts", "vite.config.mts", "vite.config.js", "vite.config.mjs"];
const FAILED = 1;
const ARGUMENTS_START = 2;

const configOf = Effect.fn("y8.config")(function* configOf(root: string) {
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
    onNone: () => Effect.succeed<Y8Config>({}),
    onSome: (file) =>
      Effect.tryPromise({
        try: () => resolveConfigFromFile(file),
        catch: failedWith(`could not load ${file}`),
      }).pipe(Effect.map(y8Section)),
  });
});

const markdownFiles = Effect.fn("y8.files")(function* markdownFiles(
  root: string,
  config: Y8Config,
) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const requested = process.argv.slice(ARGUMENTS_START);
  const pathspecs = Arr.match(requested, {
    onEmpty: () => markdownPathspecs({ config }),
    onNonEmpty: (patterns) => markdownPathspecs({ config, patterns }),
  });
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
  const files = yield* markdownFiles(root, config);
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

const services = Otlp.layerFromConfig({ resource: { serviceName: "y8" } }).pipe(
  Layer.provide(OtlpSerialization.layerJson),
  Layer.provide(FetchHttpClient.layer),
  Layer.provideMerge(NodeServices.layer),
);

export const runCli = (): void => {
  runMain(main.pipe(Effect.provide(services)));
};
