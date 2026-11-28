import { refToRelative } from "@pnpm/deps.path";
import { Array as Arr, Equal, HashSet, Option, Record as Rec, Schema, pipe } from "effect";

const References = Schema.Record(Schema.String, Schema.String);

const Importer = Schema.Struct({
  dependencies: Schema.optional(References),
  devDependencies: Schema.optional(References),
  optionalDependencies: Schema.optional(References),
});

const Snapshot = Schema.Struct({
  dependencies: Schema.optional(References),
  optionalDependencies: Schema.optional(References),
});

/** @internal */
export const LockfileShape = Schema.Struct({
  importers: Schema.Record(Schema.String, Importer),
  packages: Schema.optionalKey(Schema.Record(Schema.String, Snapshot)),
  settings: Schema.optionalKey(Schema.Unknown),
  overrides: Schema.optionalKey(Schema.Unknown),
  patchedDependencies: Schema.optionalKey(Schema.Unknown),
  packageExtensionsChecksum: Schema.optionalKey(Schema.Unknown),
  pnpmfileChecksum: Schema.optionalKey(Schema.Unknown),
});

/** @internal */
export type Resolution = typeof LockfileShape.Type;

type ImporterOf = typeof Importer.Type;

type Pinned = typeof References.Type | undefined;

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

const directOf = (importer: ImporterOf): readonly string[] =>
  keysOf(importer.dependencies, importer.devDependencies, importer.optionalDependencies);

const childrenOf =
  (lockfile: Resolution) =>
  (key: string): readonly string[] =>
    pipe(
      Rec.toEntries(lockfile.packages ?? {}),
      Arr.findFirst(([depPath]) => depPath === key),
      Option.map(([, snapshot]) => keysOf(snapshot.dependencies, snapshot.optionalDependencies)),
      Option.getOrElse((): readonly string[] => []),
    );

const resolved = (lockfile: Resolution, directory: string): HashSet.HashSet<string> => {
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

const environmentOf = (lockfile: Resolution): readonly unknown[] => [
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
  before: Resolution;
  after: Resolution;
  directories: readonly string[];
}>): boolean =>
  Equal.equals(environmentOf(before), environmentOf(after)) &&
  pipe(
    directories,
    Arr.every((directory) => Equal.equals(resolved(before, directory), resolved(after, directory))),
  );
