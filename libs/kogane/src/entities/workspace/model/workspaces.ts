import { findWorkspaceProjectsNoCheck } from "@pnpm/workspace.projects-reader";
import type { Project } from "@pnpm/workspace.projects-reader";
import { readWorkspaceManifest } from "@pnpm/workspace.workspace-manifest-reader";
import { Array as Arr, Effect, Option, Path, String as Str, pipe } from "effect";

import { WorkspaceUnreadable } from "./workspace-unreadable.ts";

export interface Workspace {
  readonly name: string;
  readonly directory: string;
  readonly description: string;
}

const unreadable = (cause: unknown): WorkspaceUnreadable => WorkspaceUnreadable.make({ cause });

const patternsIn = (root: string): Effect.Effect<readonly string[]> =>
  Effect.tryPromise({ try: () => readWorkspaceManifest(root), catch: unreadable }).pipe(
    Effect.map((manifest) =>
      pipe(
        Option.fromUndefinedOr(manifest),
        Option.flatMap(({ packages }) => Option.fromUndefinedOr(packages)),
        Option.getOrElse((): readonly string[] => []),
      ),
    ),
    Effect.orElseSucceed((): readonly string[] => []),
  );

const projectsIn = (root: string, patterns: readonly string[]): Effect.Effect<readonly Project[]> =>
  Effect.tryPromise({
    try: () => findWorkspaceProjectsNoCheck(root, { patterns: [...patterns] }),
    catch: unreadable,
  }).pipe(Effect.orElseSucceed((): readonly Project[] => []));

/** @internal */
export const workspacesIn = Effect.fn("workspacesIn")(function* workspacesIn(root: string) {
  const path = yield* Path.Path;
  const patterns = yield* patternsIn(root);
  if (!Arr.isReadonlyArrayNonEmpty(patterns)) {
    return [];
  }
  const projects = yield* projectsIn(root, patterns);
  return pipe(
    projects,
    Arr.map(({ rootDir, manifest }) => ({
      name: Option.getOrElse(Option.fromUndefinedOr(manifest.name), () => ""),
      directory: path.relative(root, rootDir),
      description: Option.getOrElse(Option.fromUndefinedOr(manifest.description), () => ""),
    })),
    Arr.filter(
      ({ directory, description }) => Str.isNonEmpty(directory) && Str.isNonEmpty(description),
    ),
  );
});
