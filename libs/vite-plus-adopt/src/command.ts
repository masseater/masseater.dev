import type { Effect, FileSystem, Path, PlatformError, Schema, Stdio } from "effect";
import type { ChildProcessSpawner } from "effect/process";

import type { VpToolsError } from "./errors.ts";

type CommandError = VpToolsError | PlatformError.PlatformError | Schema.SchemaError;

type CommandServices =
  | ChildProcessSpawner.ChildProcessSpawner
  | FileSystem.FileSystem
  | Path.Path
  | Stdio.Stdio;

type CommandEffect = Effect.Effect<void, CommandError, CommandServices>;

export type { CommandEffect, CommandError, CommandServices };
