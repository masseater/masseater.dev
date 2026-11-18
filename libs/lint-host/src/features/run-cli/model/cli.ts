import { NodeServices } from "@effect/platform-node";
import { runMain } from "@effect/platform-node/NodeRuntime";
import {
  Array as Arr,
  Console,
  Effect,
  FileSystem,
  Function as Fn,
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
const DATA_FIRST_ARITY = 2;
const ARGUMENTS_START = 2;

export interface Reported {
  readonly severity: string;
}

export interface LintCall<Config, Failure> {
  readonly root: string;
  readonly files: readonly string[];
  readonly projectFiles: readonly string[];
  readonly config: Config;
  readonly read: (file: string) => Effect.Effect<string, Failure>;
}

export interface PathspecRequest<Config> {
  readonly config: Config;
  readonly patterns?: readonly string[];
}

export interface SectionSource<Config, Failure> {
  readonly name: string;
  readonly section: (config: unknown) => Config;
  readonly failWith: FailWith<Failure>;
}

export interface Cli<Config, Found extends Reported, Failure> extends SectionSource<
  Config,
  Failure
> {
  readonly pathspecs: (request: PathspecRequest<Config>) => readonly string[];
  readonly lint: (call: LintCall<Config, Failure>) => Effect.Effect<readonly Found[], Failure>;
  readonly format: (found: Found) => string;
}

export interface ToolCall<Config> {
  readonly root: string;
  readonly config: Config;
  readonly args: readonly string[];
}

export interface Tool<Config, Found, Failure> extends SectionSource<Config, Failure> {
  readonly scan: (call: ToolCall<Config>) => Effect.Effect<readonly Found[], Failure>;
  readonly format: (found: Found) => string;
}

type CliServices = FileSystem.FileSystem | Path.Path | ChildProcessSpawner.ChildProcessSpawner;

const readSectionIn = <Config, Failure>(
  source: SectionSource<Config, Failure>,
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
          catch: source.failWith(`could not load ${file}`),
        }),
    });
    return source.section(loaded);
  }).pipe(Effect.withSpan(`${source.name}.config`));

/** @internal */
export const readSection: {
  (
    root: string,
  ): <Config, Failure>(
    source: SectionSource<Config, Failure>,
  ) => Effect.Effect<Config, Failure, FileSystem.FileSystem | Path.Path>;
  <Config, Failure>(
    source: SectionSource<Config, Failure>,
    root: string,
  ): Effect.Effect<Config, Failure, FileSystem.FileSystem | Path.Path>;
} = Fn.dual(DATA_FIRST_ARITY, readSectionIn);

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

const failWhen = (failed: boolean): Effect.Effect<void> =>
  Effect.when(
    Effect.sync(() => {
      process.exitCode = FAILED;
    }),
    Effect.succeed(failed),
  ).pipe(Effect.asVoid);

const printAll = <Found>(
  found: readonly Found[],
  format: (found: Found) => string,
): Effect.Effect<void> =>
  Arr.match(found, {
    onEmpty: () => Effect.void,
    onNonEmpty: (all) => Console.log(pipe(all, Arr.map(format), Arr.join("\n"))),
  });

const readerIn = <Failure>(
  root: string,
  failWith: FailWith<Failure>,
): Effect.Effect<
  (file: string) => Effect.Effect<string, Failure>,
  never,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* reader() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    return (file: string): Effect.Effect<string, Failure> =>
      fileSystem
        .readFileString(path.resolve(root, file))
        .pipe(Effect.mapError(failWith(`could not read ${file}`)));
  });

const mainOf = <Config, Found extends Reported, Failure>(
  cli: Cli<Config, Found, Failure>,
): Effect.Effect<void, Failure | PlatformError, CliServices> =>
  Effect.gen(function* main() {
    const root = process.cwd();
    const config = yield* readSectionIn(cli, root);
    const patterns = process.argv.slice(ARGUMENTS_START);
    const files = yield* trackedFiles(root, cli.pathspecs(requestOf(config, patterns))).pipe(
      Effect.withSpan(`${cli.name}.files`),
    );
    const projectFiles = yield* trackedFiles(root, []).pipe(Effect.withSpan(`${cli.name}.project`));
    const read = yield* readerIn(root, cli.failWith);
    const found = yield* cli.lint({ root, files, projectFiles, config, read });
    yield* printAll(found, cli.format);
    yield* failWhen(hasError(found));
  });

const toolMainOf = <Config, Found, Failure>(
  tool: Tool<Config, Found, Failure>,
): Effect.Effect<void, Failure | PlatformError, CliServices> =>
  Effect.gen(function* main() {
    const root = process.cwd();
    const config = yield* readSectionIn(tool, root);
    const found = yield* tool.scan({ root, config, args: process.argv.slice(ARGUMENTS_START) });
    yield* printAll(found, tool.format);
    yield* failWhen(Arr.isReadonlyArrayNonEmpty(found));
  });

const runTraced = <Failure>(
  name: string,
  program: Effect.Effect<void, Failure, CliServices>,
): void => {
  const services = Otlp.layerFromConfig({ resource: { serviceName: name } }).pipe(
    Layer.provide(OtlpSerialization.layerJson),
    Layer.provide(FetchHttpClient.layer),
    Layer.provideMerge(NodeServices.layer),
  );
  runMain(program.pipe(Effect.provide(services)));
};

export const runCli = <Config, Found extends Reported, Failure>(
  cli: Cli<Config, Found, Failure>,
): void => {
  runTraced(cli.name, mainOf(cli));
};

export const runTool = <Config, Found, Failure>(tool: Tool<Config, Found, Failure>): void => {
  runTraced(tool.name, toolMainOf(tool));
};
