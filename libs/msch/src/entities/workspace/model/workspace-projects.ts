import { findWorkspaceProjectsNoCheck } from "@pnpm/workspace.projects-reader";
import type { Project } from "@pnpm/workspace.projects-reader";
import { Array as Arr, Effect, Option, Order, String as Str, pipe } from "effect";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

import { workspaceManifest } from "./workspace-manifest.ts";
import { WorkspaceUnreadable } from "./workspace-unreadable.ts";

export interface WorkspaceProject {
  readonly directory: string;
  readonly packageName: Option.Option<string>;
  readonly published: boolean;
  readonly keywords: readonly string[];
  readonly files: Option.Option<readonly string[]>;
}

const byDirectory = Order.mapInput(Str.Order, ({ directory }: WorkspaceProject) => directory);

const projectsMatching = (
  root: string,
  patterns: readonly string[],
): Effect.Effect<readonly Project[]> =>
  Effect.tryPromise({
    try: () => findWorkspaceProjectsNoCheck(root, { patterns: [...patterns] }),
    catch: (cause) => WorkspaceUnreadable.make({ root, reason: String(cause) }),
  }).pipe(Effect.orElseSucceed((): readonly Project[] => []));

/** @internal */
export const workspaceProjects = Effect.fn("workspaceProjects")(function* workspaceProjects(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const manifest = yield* workspaceManifest(root);
  const patterns = pipe(
    manifest,
    Option.flatMap(({ packages }) => Option.fromNullishOr(packages)),
    Option.getOrElse((): readonly string[] => []),
  );
  if (!Arr.isReadonlyArrayNonEmpty(patterns)) {
    return [];
  }
  const projects = yield* projectsMatching(root, patterns);
  const found = pipe(
    projects,
    Arr.map(({ rootDir, manifest: own }): WorkspaceProject => ({
      directory: files.relative(root, rootDir),
      packageName: Option.fromUndefinedOr(own.name),
      published: own.private !== true,
      keywords: Option.getOrElse(Option.fromUndefinedOr(own.keywords), () => []),
      files: Option.fromUndefinedOr(own.files),
    })),
    Arr.filter(({ directory }) => Str.isNonEmpty(directory)),
  );
  return Arr.sort(found, byDirectory);
});

/** @internal */
export const workspaceDirectories = Effect.fn("workspaceDirectories")(
  function* workspaceDirectories(root: string) {
    const projects = yield* workspaceProjects(root);
    return pipe(
      projects,
      Arr.map(({ directory }) => directory),
    );
  },
);
