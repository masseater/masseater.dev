import type { Effect, FileSystem, Path, PlatformError, Schema, Stdio } from "effect";
import type { ChildProcessSpawner } from "effect/process";

import type { VpToolsError } from "./errors.ts";

export type CommandError = VpToolsError | PlatformError.PlatformError | Schema.SchemaError;

export type CommandServices =
  | ChildProcessSpawner.ChildProcessSpawner
  | FileSystem.FileSystem
  | Path.Path
  | Stdio.Stdio;

export type CommandEffect = Effect.Effect<void, CommandError, CommandServices>;

/** @internal */
