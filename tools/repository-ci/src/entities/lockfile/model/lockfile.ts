import { refToRelative } from "@pnpm/deps.path";
import type { LockfileObject, ProjectSnapshot, ResolvedDependencies } from "@pnpm/lockfile.types";
import { Array as Arr, Equal, HashSet, Option, Record as Rec, pipe } from "effect";

type Pinned = ResolvedDependencies | undefined;

const referencesOf = (references: Pinned): readonly (readonly [string, string])[] =>
  pipe(
    Option.fromNullishOr(references),
    Option.map(Rec.toEntries),
    Option.getOrElse(() => []),
  );

const keysOf = (...groups: readonly Pinned[]): readonly string[] =>
  pipe(
    groups,
    Arr.flatMap(referencesOf),
    Arr.flatMap(([name, reference]) =>
      Option.toArray(Option.fromNullishOr(refToRelative(reference, name))),
    ),
  );

const directOf = (
  importer: Pick<ProjectSnapshot, "dependencies" | "devDependencies" | "optionalDependencies">,
): readonly string[] =>
  keysOf(importer.dependencies, importer.devDependencies, importer.optionalDependencies);

const childrenOf =
  (lockfile: LockfileObject) =>
  (key: string): readonly string[] =>
    pipe(
      Rec.toEntries(lockfile.packages ?? {}),
      Arr.findFirst(([depPath]) => depPath === key),
      Option.map(([, snapshot]) => keysOf(snapshot.dependencies, snapshot.optionalDependencies)),
      Option.getOrElse((): readonly string[] => []),
    );

const resolved = (lockfile: LockfileObject, directory: string): HashSet.HashSet<string> => {
  const children = childrenOf(lockfile);
  const queue = [
    ...pipe(
      Rec.toEntries(lockfile.importers),
      Arr.findFirst(([id]) => id === directory),
      Option.map(([, importer]) => directOf(importer)),
      Option.getOrElse((): readonly string[] => []),
    ),
  ];
  const seen = new Set<string>();
  for (const key of queue) {
    if (!seen.has(key)) {
      seen.add(key);
      queue.push(...children(key));
    }
  }
  return HashSet.fromIterable(seen);
};

const environmentOf = (lockfile: LockfileObject): readonly unknown[] => [
  lockfile.settings,
  lockfile.overrides,
  lockfile.patchedDependencies,
  lockfile.packageExtensionsChecksum,
  lockfile.pnpmfileChecksum,
];

/** @internal */
export const sameResolution = ({
  before,
  after,
  directories,
}: Readonly<{
  before: LockfileObject;
  after: LockfileObject;
  directories: readonly string[];
}>): boolean =>
  Equal.equals(environmentOf(before), environmentOf(after)) &&
  pipe(
    directories,
    Arr.every((directory) => Equal.equals(resolved(before, directory), resolved(after, directory))),
  );
