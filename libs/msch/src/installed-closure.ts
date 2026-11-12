import {
  Array as Arr,
  Effect,
  HashSet,
  Number as Num,
  Option,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";

import { MANIFEST_FILE, NODE_MODULES } from "./dependencies.ts";
import { RepositoryFiles } from "./repository-files.ts";

const EMPTY = 0;

const DependencyMap = Schema.optional(Schema.Record(Schema.String, Schema.String));
const PeerMetaEntry = Schema.Struct({ optional: Schema.optional(Schema.Boolean) });
const PeerMeta = Schema.optional(Schema.Record(Schema.String, PeerMetaEntry));
const InstalledManifest = Schema.Struct({
  dependencies: DependencyMap,
  optionalDependencies: DependencyMap,
  peerDependencies: DependencyMap,
  peerDependenciesMeta: PeerMeta,
});
type Installed = typeof InstalledManifest.Type;

type Pending = readonly (readonly [string, string])[];

interface Collect {
  readonly pending: Pending;
  readonly seen: HashSet.HashSet<string>;
}

const decodeManifest = Schema.decodeOption(Schema.fromJsonString(InstalledManifest));

const keysOf = (map: Readonly<Record<string, string>> | undefined): readonly string[] =>
  pipe(
    Option.fromUndefinedOr(map),
    Option.map(Rec.keys),
    Option.getOrElse((): readonly string[] => []),
  );

const isOptionalPeer = (manifest: Installed, name: string): boolean =>
  pipe(
    Option.fromUndefinedOr(manifest.peerDependenciesMeta),
    Option.flatMap(Rec.get(name)),
    Option.exists((meta) => meta.optional === true),
  );

const installedNames = (manifest: Installed): readonly string[] => [
  ...keysOf(manifest.dependencies),
  ...keysOf(manifest.optionalDependencies),
  ...pipe(
    keysOf(manifest.peerDependencies),
    Arr.filter((name) => !isOptionalPeer(manifest, name)),
  ),
];

const childrenOf = Effect.fn("childrenOf")(function* childrenOf(directory: string) {
  const files = yield* RepositoryFiles;
  const text = yield* files.readFile(files.join(directory, MANIFEST_FILE));
  return pipe(
    text,
    Option.flatMap(decodeManifest),
    Option.map(installedNames),
    Option.getOrElse((): readonly string[] => []),
    Arr.map((child) => [directory, child] as const),
  );
});

const resolveFrom = (
  from: string,
  name: string,
): Effect.Effect<Option.Option<string>, never, RepositoryFiles> =>
  Effect.gen(function* resolvePackage() {
    const files = yield* RepositoryFiles;
    const candidate = files.join(from, NODE_MODULES, name);
    const found = yield* files.exists(files.join(candidate, MANIFEST_FILE));
    if (found) {
      const real = yield* files.realPath(candidate);
      return Option.some(real);
    }
    const parent = files.dirname(from);
    if (parent === from) {
      return Option.none<string>();
    }
    return yield* resolveFrom(parent, name);
  });

const unseen = (
  from: string,
  name: string,
  seen: HashSet.HashSet<string>,
): Effect.Effect<Option.Option<string>, never, RepositoryFiles> =>
  resolveFrom(from, name).pipe(
    Effect.map(Option.filter((directory) => !HashSet.has(seen, directory))),
  );

const closureOf = (
  provided: HashSet.HashSet<string>,
  collect: Collect,
): Effect.Effect<HashSet.HashSet<string>, never, RepositoryFiles> =>
  Arr.match(collect.pending, {
    onEmpty: () => Effect.succeed(collect.seen),
    onNonEmpty: ([[from, name], ...rest]) => {
      if (HashSet.has(provided, name)) {
        return closureOf(provided, { ...collect, pending: rest });
      }
      return unseen(from, name, collect.seen).pipe(
        Effect.flatMap((resolved) => {
          if (Option.isNone(resolved)) {
            return closureOf(provided, { ...collect, pending: rest });
          }
          return childrenOf(resolved.value).pipe(
            Effect.flatMap((children) =>
              closureOf(provided, {
                pending: [...rest, ...children],
                seen: HashSet.add(collect.seen, resolved.value),
              }),
            ),
          );
        }),
      );
    },
  });

const directorySize = (directory: string): Effect.Effect<number, never, RepositoryFiles> =>
  Effect.gen(function* sizeOfDirectory() {
    const files = yield* RepositoryFiles;
    const names = yield* files.readDirectory(directory);
    const entries = pipe(
      names,
      Arr.filter((name) => name !== NODE_MODULES),
      Arr.map((name) => files.join(directory, name)),
    );
    const sizes = yield* pipe(
      entries,
      Effect.forEach((entry) =>
        files.isDirectory(entry).pipe(
          Effect.flatMap((kind) => {
            if (Option.isNone(kind)) {
              return Effect.succeed(EMPTY);
            }
            if (kind.value) {
              return directorySize(entry);
            }
            return files.fileSize(entry);
          }),
        ),
      ),
    );
    return Num.sumAll(sizes);
  });

interface ClosureRoot {
  readonly provided: HashSet.HashSet<string>;
  readonly from: string;
  readonly name: string;
}

const installedClosure = ({
  provided,
  from,
  name,
}: ClosureRoot): Effect.Effect<HashSet.HashSet<string>, never, RepositoryFiles> =>
  closureOf(provided, { pending: [[from, name]], seen: HashSet.empty() });

const installedSize = (directory: string): Effect.Effect<number, never, RepositoryFiles> => {
  if (Str.includes(`/${NODE_MODULES}/`)(directory)) {
    return directorySize(directory);
  }
  return Effect.succeed(EMPTY);
};

export { installedClosure, installedSize, keysOf };
export type { ClosureRoot };
