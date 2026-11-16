import { findWorkspaceProjectsNoCheck } from "@pnpm/workspace.projects-reader";
import type { Project } from "@pnpm/workspace.projects-reader";
import { Array as Arr, Effect, Option, Order, String as Str, pipe } from "effect";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

import { workspaceManifest } from "./workspace-manifest.ts";

export interface WorkspaceProject {
  readonly directory: string;
  readonly packageName: Option.Option<string>;
}

const byDirectory = Order.mapInput(Str.Order, (project: WorkspaceProject) => project.directory);

const projectsMatching = (
  root: string,
  patterns: readonly string[],
): Effect.Effect<readonly Project[]> =>
  Effect.tryPromise(() => findWorkspaceProjectsNoCheck(root, { patterns: [...patterns] })).pipe(
    Effect.orElseSucceed((): readonly Project[] => []),
  );

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
    Arr.map((project): WorkspaceProject => ({
      directory: files.relative(root, project.rootDir),
      packageName: Option.fromUndefinedOr(project.manifest.name),
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
