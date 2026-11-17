import { refToRelative } from "@pnpm/deps.path";
import { Array as Arr, Effect, Option, Record as Rec, pipe } from "effect";

import { wantedLockfile } from "./locked-packages.ts";
import type { WantedLockfile } from "./locked-packages.ts";
import type { LockfileUnreadable } from "./lockfile-unreadable.ts";

export interface LockedNode {
  readonly id: string;
  readonly dependencies: readonly string[];
}

const MANIFEST = "package.json";
const ROOT_IMPORTER = ".";

type ProjectSnapshot = WantedLockfile["importers"][keyof WantedLockfile["importers"]];

type ResolvedSections = Readonly<
  Partial<Pick<ProjectSnapshot, "dependencies" | "devDependencies" | "optionalDependencies">>
>;

export type ResolvedDependencies = Readonly<
  NonNullable<WantedLockfile["importers"][keyof WantedLockfile["importers"]]["dependencies"]>
>;

interface LockedSnapshots<Importer extends string, Package extends string> {
  readonly importers: Readonly<Record<Importer, ResolvedSections>>;
  readonly packages?: Readonly<Record<Package, ResolvedSections>> | undefined;
}

const importerManifest = (id: string): string =>
  Option.match(
    Option.liftPredicate(id, (found) => found === ROOT_IMPORTER),
    {
      onNone: () => `${id}/${MANIFEST}`,
      onSome: () => MANIFEST,
    },
  );

export const depPathsOf = (resolved: ResolvedDependencies | undefined): readonly string[] =>
  pipe(
    Rec.toEntries(resolved ?? {}),
    Arr.flatMap(([name, reference]) =>
      Option.toArray(Option.fromNullishOr(refToRelative(reference, name))),
    ),
  );

const nodesOf = <Importer extends string, Package extends string>(
  lockfile: LockedSnapshots<Importer, Package>,
): readonly LockedNode[] => [
  ...pipe(
    Rec.toEntries(lockfile.importers),
    Arr.map(([id, project]) => ({
      id: importerManifest(id),
      dependencies: [
        ...depPathsOf(project.dependencies),
        ...depPathsOf(project.devDependencies),
        ...depPathsOf(project.optionalDependencies),
      ],
    })),
  ),
  ...pipe(
    Option.match(Option.fromUndefinedOr(lockfile.packages), {
      onNone: (): readonly (readonly [Package, ResolvedSections])[] => [],
      onSome: Rec.toEntries,
    }),
    Arr.map(([id, snapshot]) => ({
      id,
      dependencies: [
        ...depPathsOf(snapshot.dependencies),
        ...depPathsOf(snapshot.optionalDependencies),
      ],
    })),
  ),
];

/** @internal */
export const lockedGraph = (
  root: string,
): Effect.Effect<Option.Option<readonly LockedNode[]>, LockfileUnreadable> =>
  wantedLockfile(root).pipe(Effect.map(Option.map(nodesOf)));
