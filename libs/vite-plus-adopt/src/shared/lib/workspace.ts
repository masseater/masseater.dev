import { relative } from "node:path";

import { findWorkspaceProjectsNoCheck } from "@pnpm/workspace.projects-reader";
import type { Project } from "@pnpm/workspace.projects-reader";
import { readWorkspaceManifest } from "@pnpm/workspace.workspace-manifest-reader";
import { Array as Arr, Effect, Option, Order, Record as Rec, String as Str, pipe } from "effect";

import { attempt } from "./attempt.ts";
import type { VpToolsError } from "./errors.ts";

const DEPENDENCY_FIELDS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
] as const;

const MANIFEST_FILE = "package.json";

/** @internal */
export type DependencyField = (typeof DEPENDENCY_FIELDS)[number];

/** @internal */
export interface Dependency {
  readonly manifest: string;
  readonly field: DependencyField;
  readonly name: string;
  readonly specifier: string;
}

const pnpm = attempt("pnpm");

const manifestOf =
  (root: string) =>
  (project: Project): string =>
    pipe(relative(root, project.rootDir), (directory) =>
      Str.isEmpty(directory) ? MANIFEST_FILE : `${directory}/${MANIFEST_FILE}`,
    );

const byManifest = (root: string): Order.Order<Project> =>
  Order.mapInput(Str.Order, (project: Project) => relative(root, project.rootDir));

const dependenciesOf =
  (root: string) =>
  (project: Project): readonly Dependency[] => {
    const manifest = manifestOf(root)(project);
    return pipe(
      DEPENDENCY_FIELDS,
      Arr.flatMap((field) =>
        pipe(
          Rec.toEntries(project.manifest[field] ?? {}),
          Arr.map(([name, specifier]) => ({ manifest, field, name, specifier })),
        ),
      ),
    );
  };

/** @internal */
export const listDependencies = (
  root: string,
): Effect.Effect<readonly Dependency[], VpToolsError> =>
  Effect.gen(function* list() {
    const workspace = yield* pnpm(() => readWorkspaceManifest(root));
    const patterns = pipe(
      Option.fromUndefinedOr(workspace),
      Option.flatMap(({ packages }) => Option.fromNullishOr(packages)),
      Option.getOrElse((): string[] => []),
    );
    const projects = yield* pnpm(() => findWorkspaceProjectsNoCheck(root, { patterns }));
    return pipe(Arr.sort(projects, byManifest(root)), Arr.flatMap(dependenciesOf(root)));
  });
