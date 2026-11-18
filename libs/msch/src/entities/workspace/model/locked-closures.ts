import { Array as Arr, Effect, Option, Record as Rec, String as Str, pipe } from "effect";

import { reachable } from "#/shared/lib/reachable.ts";
import type { Edges } from "#/shared/lib/reachable.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

import { depPathsOf } from "./locked-graph.ts";
import type { ResolvedDependencies } from "./locked-graph.ts";
import { linkedPaths } from "./locked-links.ts";
import { wantedLockfile } from "./locked-packages.ts";

type LockedClosures = Readonly<Record<string, readonly string[]>>;

const IMPORTER = "importer:";
const ROOT_IMPORTER = ".";

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

const closureOf =
  (edges: Edges) =>
  ({ own }: Importer): readonly string[] => {
    const packages = pipe(
      reachable(edges, own),
      Arr.filter((id) => !Str.startsWith(IMPORTER)(id)),
    );
    return Arr.sort(packages, Str.Order);
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
      return Rec.fromEntries(
        pipe(
          found,
          Arr.map((importer) => [importer.id, closureOf(edges)(importer)] as const),
        ),
      );
    }),
  );
});
