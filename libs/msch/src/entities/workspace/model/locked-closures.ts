import { Array as Arr, Effect, Option, Record as Rec, String as Str, pipe } from "effect";

import { reachable } from "#/shared/lib/reachable.ts";
import type { Edges } from "#/shared/lib/reachable.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

import { depPathsOf } from "./locked-graph.ts";
import type { ResolvedDependencies } from "./locked-graph.ts";
import { linkedPaths } from "./locked-links.ts";
import { wantedLockfile } from "./locked-packages.ts";

export interface LockedClosure {
  readonly packages: readonly string[];
  readonly workspaces: readonly string[];
}

type LockedClosures = Readonly<Record<string, LockedClosure>>;

const IMPORTER = "importer:";
const ROOT_IMPORTER = ".";
const isImporter = Str.startsWith(IMPORTER);

type Sections = readonly (ResolvedDependencies | undefined)[];
type Edge = readonly [string, readonly string[]];

interface Used {
  readonly dependencies?: ResolvedDependencies | undefined;
  readonly optionalDependencies?: ResolvedDependencies | undefined;
}

interface Importer {
  readonly id: string;
  readonly own: readonly string[];
  readonly used: readonly string[];
}

const usedSections = ({ dependencies, optionalDependencies }: Used): Sections => [
  dependencies,
  optionalDependencies,
];

const packageEdges = <Package extends string>(
  packages: Readonly<Record<Package, Used>>,
): readonly Edge[] =>
  pipe(
    Rec.toEntries(packages),
    Arr.map(([id, snapshot]): Edge => [id, pipe(usedSections(snapshot), Arr.flatMap(depPathsOf))]),
  );

const workspacesOf = (nodes: readonly string[]): readonly string[] =>
  pipe(nodes, Arr.filter(isImporter), Arr.map(Str.slice(IMPORTER.length)));

const closureOf =
  (edges: Edges, hoisted: readonly string[]) =>
  ({ id, own }: Importer): LockedClosure => {
    const nodes = reachable(edges, own);
    return {
      packages: Arr.sort(
        pipe(
          nodes,
          Arr.filter((node) => !isImporter(node)),
        ),
        Str.Order,
      ),
      workspaces: Arr.sort(Arr.dedupe([...workspacesOf(nodes), ...hoisted, id]), Str.Order),
    };
  };

const closuresOf = (found: readonly Importer[], edges: Edges): LockedClosures => {
  const hoisted = pipe(
    Arr.findFirst(found, ({ id }) => id === ROOT_IMPORTER),
    Option.map(({ own }) => workspacesOf(reachable(edges, own))),
    Option.getOrElse((): readonly string[] => []),
  );
  return Rec.fromEntries(
    pipe(
      found,
      Arr.map((importer) => [importer.id, closureOf(edges, hoisted)(importer)] as const),
    ),
  );
};

/** @internal */
export const lockedClosures = Effect.fn("lockedClosures")(function* lockedClosures(root: string) {
  const files = yield* RepositoryFiles;
  const lockfile = yield* wantedLockfile(root);
  const nodesOf = (id: string, sections: Sections): readonly string[] => [
    ...pipe(sections, Arr.flatMap(depPathsOf)),
    ...pipe(
      linkedPaths(sections),
      Arr.map((path) => files.relative(root, files.join(root, id, path))),
      Arr.map(
        (linked) =>
          `${IMPORTER}${Option.getOrElse(Option.liftPredicate(linked, Str.isNonEmpty), () => ROOT_IMPORTER)}`,
      ),
    ),
  ];
  return pipe(
    lockfile,
    Option.map(({ importers, packages }): LockedClosures => {
      const found = pipe(
        Rec.toEntries(importers),
        Arr.map(([id, project]): Importer => {
          const used = usedSections(project);
          return {
            id,
            own: nodesOf(id, [...used, project.devDependencies]),
            used: nodesOf(id, used),
          };
        }),
      );
      const edges = Rec.fromEntries([
        ...pipe(
          found,
          Arr.map(({ id, used }): Edge => [`${IMPORTER}${id}`, used]),
        ),
        ...packageEdges(packages ?? {}),
      ]);
      return closuresOf(found, edges);
    }),
  );
});
