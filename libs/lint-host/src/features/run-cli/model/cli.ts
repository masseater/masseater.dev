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
import type { PlatformError } from "effect/PlatformError";
import { ChildProcess, ChildProcessSpawner } from "effect/process";
import { resolveConfigFromFile } from "vite-plus";

import type { FailWith } from "#/shared/lib/fail.ts";

const CONFIG_FILES = ["vite.config.ts", "vite.config.mts", "vite.config.js", "vite.config.mjs"];
const FAILED = 1;
const ARGUMENTS_START = 2;

export interface Reported {
  readonly severity: string;
}

export interface LintCall<Config> {
  readonly root: string;
  readonly files: readonly string[];
  readonly projectFiles: readonly string[];
  readonly config: Config;
}

export interface PathspecRequest<Config> {
  readonly config: Config;
  readonly patterns?: readonly string[];
}

export interface Cli<Config, Found extends Reported, Failure> {
  readonly name: string;
  readonly section: (config: unknown) => Config;
  readonly pathspecs: (request: PathspecRequest<Config>) => readonly string[];
  readonly lint: (call: LintCall<Config>) => Effect.Effect<readonly Found[], Failure>;
  readonly format: (found: Found) => string;
  readonly failWith: FailWith<Failure>;
}

const configOf = <Config, Found extends Reported, Failure>(
  cli: Cli<Config, Found, Failure>,
  root: string,
): Effect.Effect<Config, Failure, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* readConfig() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const found = yield* pipe(
      CONFIG_FILES,
      Arr.map((name) => path.join(root, name)),
      Effect.filter((file) => fileSystem.exists(file).pipe(Effect.orElseSucceed(() => false))),
    );
    const loaded = yield* Option.match(Arr.head(found), {
      onNone: () => Effect.succeed<unknown>({}),
      onSome: (file) =>
        Effect.tryPromise({
          try: () => resolveConfigFromFile(file),
          catch: cli.failWith(`could not load ${file}`),
        }),
    });
    return cli.section(loaded);
  }).pipe(Effect.withSpan(`${cli.name}.config`));

const trackedFiles = (
  root: string,
  pathspecs: readonly string[],
): Effect.Effect<readonly string[], PlatformError, ChildProcessSpawner.ChildProcessSpawner> =>
  Effect.gen(function* listFiles() {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const output = yield* spawner.string(
      ChildProcess.make(
        "git",
        ["ls-files", "-co", "--exclude-standard", "-z", "--", ...pathspecs],
        { cwd: root },
      ),
    );
    return pipe(Str.split(output, "\0"), Arr.filter(Str.isNonEmpty));
  });

const requestOf = <Config>(config: Config, patterns: readonly string[]): PathspecRequest<Config> =>
  Arr.match(patterns, {
    onEmpty: () => ({ config }),
    onNonEmpty: (given) => ({ config, patterns: given }),
  });

const hasError = (found: readonly Reported[]): boolean =>
  pipe(
    found,
    Arr.some(({ severity }) => severity === "error"),
  );

const mainOf = <Config, Found extends Reported, Failure>(
  cli: Cli<Config, Found, Failure>,
): Effect.Effect<
  void,
  Failure | PlatformError,
  FileSystem.FileSystem | Path.Path | ChildProcessSpawner.ChildProcessSpawner
> =>
  Effect.gen(function* main() {
    const root = process.cwd();
    const config = yield* configOf(cli, root);
    const patterns = process.argv.slice(ARGUMENTS_START);
    const files = yield* trackedFiles(root, cli.pathspecs(requestOf(config, patterns))).pipe(
      Effect.withSpan(`${cli.name}.files`),
    );
    const projectFiles = yield* trackedFiles(root, []).pipe(Effect.withSpan(`${cli.name}.project`));
    const found = yield* cli.lint({ root, files, projectFiles, config });
    yield* Arr.match(found, {
      onEmpty: () => Effect.void,
      onNonEmpty: (all) => Console.log(pipe(all, Arr.map(cli.format), Arr.join("\n"))),
    });
    yield* Effect.when(
      Effect.sync(() => {
        process.exitCode = FAILED;
      }),
      Effect.sync(() => hasError(found)),
    );
  });

export const runCli = <Config, Found extends Reported, Failure>(
  cli: Cli<Config, Found, Failure>,
): void => {
  const services = Otlp.layerFromConfig({ resource: { serviceName: cli.name } }).pipe(
    Layer.provide(OtlpSerialization.layerJson),
    Layer.provide(FetchHttpClient.layer),
    Layer.provideMerge(NodeServices.layer),
  );
  runMain(mainOf(cli).pipe(Effect.provide(services)));
};
