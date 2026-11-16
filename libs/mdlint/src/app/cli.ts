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
import type { MdlintConfig } from "./index.ts";

const CONFIG_FILES = ["vite.config.ts", "vite.config.mts", "vite.config.js", "vite.config.mjs"];
const MARKDOWN = "*.md";
const FAILED = 1;
const ARGUMENTS_START = 2;

const sectionOf = (config: unknown): MdlintConfig =>
  pipe(
    Option.liftPredicate(
      config,
      (value): value is { readonly mdlint: MdlintConfig } =>
        typeof value === "object" && value !== null && "mdlint" in value,
    ),
    Option.map((value) => value.mdlint),
    Option.getOrElse((): MdlintConfig => ({})),
  );

const configOf = Effect.fn("mdlint.config")(function* configOf(root: string) {
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
    onNone: () => Effect.succeed<MdlintConfig>({}),
    onSome: (file) =>
      Effect.tryPromise({
        try: () => resolveConfigFromFile(file),
        catch: failedWith(`could not load ${file}`),
      }).pipe(Effect.map(sectionOf)),
  });
});

const markdownFiles = Effect.fn("mdlint.files")(function* markdownFiles(
  root: string,
  config: MdlintConfig,
) {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const requested = process.argv.slice(ARGUMENTS_START);
  const patterns = Arr.match(requested, {
    onEmpty: () => [MARKDOWN],
    onNonEmpty: (given) => given,
  });
  const excluded = pipe(
    config.ignores ?? [],
    Arr.map((glob) => `:(glob,exclude)${glob}`),
  );
  const output = yield* spawner.string(
    ChildProcess.make(
      "git",
      ["ls-files", "-co", "--exclude-standard", "-z", "--", ...patterns, ...excluded],
      { cwd: root },
    ),
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

const tracing = Otlp.layerFromConfig({ resource: { serviceName: "mdlint" } }).pipe(
  Layer.provide(OtlpSerialization.layerJson),
  Layer.provide(FetchHttpClient.layer),
);

const services = Layer.merge(NodeServices.layer, tracing);

export const runCli = (): void => {
  runMain(main.pipe(Effect.provide(services)));
};
