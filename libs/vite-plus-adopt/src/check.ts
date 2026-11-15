import type { Effect, FileSystem, Option, Path, PlatformError, Schema } from "effect";
import type { ChildProcessSpawner } from "effect/process";

import type { VpToolsError } from "./errors.ts";
import type { Report } from "./report.ts";
import type { ToolSections } from "./types.ts";

export interface CheckContext {
  readonly root: string;
  readonly config: ToolSections;
  readonly base: string;
}

export type CheckError = VpToolsError | PlatformError.PlatformError | Schema.SchemaError;

export type CheckServices =
  | ChildProcessSpawner.ChildProcessSpawner
  | FileSystem.FileSystem
  | Path.Path;

export type Check = (
  context: CheckContext,
) => Effect.Effect<Option.Option<Report>, CheckError, CheckServices>;

export interface NamedCheck {
  readonly name: string;
  readonly run: Check;
}

/** @internal */
