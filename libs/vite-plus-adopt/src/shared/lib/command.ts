import type { Effect, FileSystem, Path, PlatformError, Schema, Stdio } from "effect";
import type { ChildProcessSpawner } from "effect/process";

import type { VpToolsError } from "./errors.ts";

/** @internal */
export type CommandError = VpToolsError | PlatformError.PlatformError | Schema.SchemaError;

/** @internal */
export type CommandServices =
  | ChildProcessSpawner.ChildProcessSpawner
  | FileSystem.FileSystem
  | Path.Path
  | Stdio.Stdio;

/** @internal */
export type CommandEffect = Effect.Effect<void, CommandError, CommandServices>;
