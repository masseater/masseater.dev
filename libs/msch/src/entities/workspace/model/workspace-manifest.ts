import { readWorkspaceManifest } from "@pnpm/workspace.workspace-manifest-reader";
import type { WorkspaceManifest } from "@pnpm/workspace.workspace-manifest-reader";
import { Effect, Option } from "effect";

/** @internal */
export const workspaceManifest = (root: string): Effect.Effect<Option.Option<WorkspaceManifest>> =>
  Effect.tryPromise(() => readWorkspaceManifest(root)).pipe(
    Effect.map(Option.fromUndefinedOr),
    Effect.orElseSucceed(() => Option.none()),
  );
