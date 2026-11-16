import { findWorkspaceProjectsNoCheck } from "@pnpm/workspace.projects-reader";
import { readWorkspaceManifest } from "@pnpm/workspace.workspace-manifest-reader";
import {
  Array as Arr,
  Effect,
  Option,
  Order,
  Path,
  Record as Rec,
  String as Str,
  pipe,
} from "effect";

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

type DeclaredDependencies = Readonly<
  Partial<Record<DependencyField, Readonly<Record<string, string>>>>
>;

interface ListedManifest {
  readonly file: string;
  readonly dependencies: readonly Dependency[];
}

const pnpm = attempt("pnpm");

const byFile = Order.mapInput(Str.Order, ({ file }: ListedManifest) => file);

const manifestIn = (directory: string): string =>
  pipe(
    Option.liftPredicate(directory, Str.isNonEmpty),
    Option.map((own) => `${own}/${MANIFEST_FILE}`),
    Option.getOrElse(() => MANIFEST_FILE),
  );

const dependenciesIn = (file: string, declared: DeclaredDependencies): readonly Dependency[] =>
  pipe(
    DEPENDENCY_FIELDS,
    Arr.flatMap((field) => {
      const entries = Rec.toEntries(
        Option.getOrElse(Option.fromUndefinedOr(declared[field]), () => ({})),
      );
      return pipe(
        entries,
        Arr.map(([name, specifier]): Dependency => ({ manifest: file, field, name, specifier })),
      );
    }),
  );

/** @internal */
export const listDependencies = (
  root: string,
): Effect.Effect<readonly Dependency[], VpToolsError, Path.Path> =>
  Effect.gen(function* list() {
    const path = yield* Path.Path;
    const workspace = yield* pnpm(() => readWorkspaceManifest(root));
    const patterns = pipe(
      Option.fromUndefinedOr(workspace),
      Option.flatMap(({ packages }) => Option.fromNullishOr(packages)),
      Option.getOrElse((): string[] => []),
    );
    const projects = yield* pnpm(() => findWorkspaceProjectsNoCheck(root, { patterns }));
    const listed = pipe(
      projects,
      Arr.map(({ rootDir, manifest }): ListedManifest => {
        const file = manifestIn(path.relative(root, rootDir));
        return { file, dependencies: dependenciesIn(file, manifest) };
      }),
    );
    return pipe(
      Arr.sort(listed, byFile),
      Arr.flatMap(({ dependencies }) => dependencies),
    );
  });
