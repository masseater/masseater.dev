import { Effect, FileSystem, Function as Fn, Option, Path, Array as Arr, pipe } from "effect";
import { resolveConfigFromFile } from "vite-plus";

import type { ToolSection, ToolSections } from "#/shared/config/index.ts";
import { attempt } from "#/shared/lib/attempt.ts";
import { configMissing } from "#/shared/lib/errors.ts";
import type { VpToolsError } from "#/shared/lib/errors.ts";

/** @internal */
export type FileServices = FileSystem.FileSystem | Path.Path;

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
    return yield* Effect.fromOption(Arr.head(existing)).pipe(
      Effect.mapError(() => configMissing(`No vite.config file in ${root}`)),
    );
  });

/** @internal */
export const loadViteConfig = (
  root: string,
): Effect.Effect<ToolSections, VpToolsError, FileServices> =>
  findConfigFile(root).pipe(
    Effect.flatMap((file) => attempt("vite.config")(() => resolveConfigFromFile(file))),
  );

const requireSection =
  <Key extends ToolSection>(key: Key) =>
  (config: ToolSections): Effect.Effect<NonNullable<ToolSections[Key]>, VpToolsError> =>
    Effect.fromOption(Option.fromNullishOr(config[key])).pipe(
      Effect.mapError(() => configMissing(`vite.config has no "${key}" section`)),
    );

const DATA_FIRST_ARITY = 2;

/** @internal */
export const loadSection: {
  <Key extends ToolSection>(
    key: Key,
  ): (root: string) => Effect.Effect<NonNullable<ToolSections[Key]>, VpToolsError, FileServices>;
  <Key extends ToolSection>(
    root: string,
    key: Key,
  ): Effect.Effect<NonNullable<ToolSections[Key]>, VpToolsError, FileServices>;
} = Fn.dual(
  DATA_FIRST_ARITY,
  <Key extends ToolSection>(
    root: string,
    key: Key,
  ): Effect.Effect<NonNullable<ToolSections[Key]>, VpToolsError, FileServices> =>
    loadViteConfig(root).pipe(Effect.flatMap(requireSection(key))),
);
