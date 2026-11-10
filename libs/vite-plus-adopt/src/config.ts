import { Effect, FileSystem, Option, Path, Array as Arr, pipe } from "effect";
import { resolveConfigFromFile } from "vite-plus";

import { attempt } from "./attempt.ts";
import { configMissing } from "./errors.ts";
import type { VpToolsError } from "./errors.ts";
import type { ToolSection, ToolSections } from "./types.ts";

type FileServices = FileSystem.FileSystem | Path.Path;

const CONFIG_FILES = ["vite.config.ts", "vite.config.mts", "vite.config.js", "vite.config.mjs"];

const findConfigFile = (root: string): Effect.Effect<string, VpToolsError, FileServices> =>
  Effect.gen(function* find() {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const existing = yield* pipe(
      CONFIG_FILES,
      Arr.map((name) => path.join(root, name)),
      Effect.filter((file) => fs.exists(file).pipe(Effect.orElseSucceed(() => false))),
    );
    return yield* pipe(
      Arr.head(existing),
      Option.match({
        onNone: () => Effect.fail(configMissing(`No vite.config file in ${root}`)),
        onSome: Effect.succeed,
      }),
    );
  });

const loadViteConfig = (root: string): Effect.Effect<ToolSections, VpToolsError, FileServices> =>
  findConfigFile(root).pipe(
    Effect.flatMap((file) => attempt("vite.config")(() => resolveConfigFromFile(file))),
  );

const requireSection =
  <Key extends ToolSection>(key: Key) =>
  (config: ToolSections): Effect.Effect<NonNullable<ToolSections[Key]>, VpToolsError> =>
    pipe(
      Option.fromNullishOr(config[key]),
      Option.match({
        onNone: () => Effect.fail(configMissing(`vite.config has no "${key}" section`)),
        onSome: Effect.succeed,
      }),
    );

const loadSection = <Key extends ToolSection>(
  root: string,
  key: Key,
): Effect.Effect<NonNullable<ToolSections[Key]>, VpToolsError, FileServices> =>
  loadViteConfig(root).pipe(Effect.flatMap(requireSection(key)));

export { loadSection, loadViteConfig };
export type { FileServices };
