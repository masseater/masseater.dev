import { readWorkspaceManifest } from "@pnpm/workspace.workspace-manifest-reader";
import type { WorkspaceManifest } from "@pnpm/workspace.workspace-manifest-reader";
import { Effect, Option } from "effect";

import { WorkspaceUnreadable } from "./workspace-unreadable.ts";

/** @internal */
export const workspaceManifest = (root: string): Effect.Effect<Option.Option<WorkspaceManifest>> =>
  Effect.tryPromise({
    try: () => readWorkspaceManifest(root),
    catch: (cause) => WorkspaceUnreadable.make({ root, reason: String(cause) }),
  }).pipe(
    Effect.map(Option.fromUndefinedOr),
    Effect.orElseSucceed(() => Option.none()),
  );
