import type { Effect, FileSystem, Option, Path, PlatformError, Schema } from "effect";
import type { ChildProcessSpawner } from "effect/process";

import type { ToolSections } from "#/shared/config/index.ts";
import type { VpToolsError } from "#/shared/lib/errors.ts";
import type { Report } from "#/shared/lib/report.ts";

/** @internal */
export interface CheckContext {
  readonly root: string;
  readonly config: ToolSections;
  readonly base: string;
}

/** @internal */
export type CheckError = VpToolsError | PlatformError.PlatformError | Schema.SchemaError;

/** @internal */
export type CheckServices =
  | ChildProcessSpawner.ChildProcessSpawner
  | FileSystem.FileSystem
  | Path.Path;

/** @internal */
export type Check = (
  context: CheckContext,
) => Effect.Effect<Option.Option<Report>, CheckError, CheckServices>;

/** @internal */
export interface NamedCheck {
  readonly name: string;
  readonly run: Check;
}
