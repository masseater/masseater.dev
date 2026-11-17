import { Array as Arr, Option, Record as Rec, Schema, String as Str, pipe } from "effect";

export const SEPARATOR = "/";
export const LOCK_FILE = "Cargo.lock";
export const MANIFEST_FILE = "Cargo.toml";
const IGNORE_FILE = ".gitignore";
const LAST_SEGMENT = /\/[^/]*$/u;
const NEXT = 1;

const IgnoredDirectory = Schema.Struct({
  pattern: Schema.String,
  base: Schema.Literal("workspace"),
});
const CargoPackageSchema = Schema.Struct({
  id: Schema.String,
  manifest_path: Schema.String,
  source: Schema.NullOr(Schema.String),
});
const CargoNode = Schema.Struct({
  id: Schema.String,
  deps: Schema.Array(Schema.Struct({ pkg: Schema.String })),
});
export const CargoMetadataSchema = Schema.Struct({
  packages: Schema.Array(CargoPackageSchema),
  resolve: Schema.Struct({ nodes: Schema.Array(CargoNode) }),
  workspace_members: Schema.Array(Schema.String),
  workspace_root: Schema.String,
});
export const CargoWorkspaceSchema = Schema.Struct({
  metadata: CargoMetadataSchema,
  ignored: Schema.Array(IgnoredDirectory),
});
export type CargoMetadata = typeof CargoMetadataSchema.Type;
export type CargoWorkspace = typeof CargoWorkspaceSchema.Type;
export type CargoPackage = typeof CargoPackageSchema.Type;

const normalized = Str.replaceAll("\\", SEPARATOR);

export const relativeTo =
  (root: string) =>
  (file: string): Option.Option<string> => {
    const prefix = `${normalized(root)}${SEPARATOR}`;
    const path = normalized(file);
    return Option.some(Str.slice(prefix.length)(path)).pipe(
      Option.filter(() => Str.startsWith(prefix)(path)),
    );
  };

export const directoryOf = (file: string): string =>
  pipe(normalized(file), Str.replace(LAST_SEGMENT, ""));

export const isWithin =
  (directory: string) =>
  (path: string): boolean =>
    Str.isEmpty(directory) ||
    path === directory ||
    Str.startsWith(`${directory}${SEPARATOR}`)(path);

export const isLocal = (entry: CargoPackage): boolean => entry.source === null;

const reachable = (
  edges: Readonly<Record<string, readonly string[]>>,
  seen: readonly string[],
  frontier: readonly string[],
): readonly string[] => {
  const fresh = pipe(
    frontier,
    Arr.dedupe,
    Arr.filter((id) => !Arr.contains(seen, id)),
  );
  if (Arr.isReadonlyArrayEmpty(fresh)) {
    return seen;
  }
  const next = pipe(
    fresh,
    Arr.flatMap((id) => edges[id] ?? []),
  );
  return reachable(edges, [...seen, ...fresh], next);
};

export const closureOf =
  (metadata: CargoMetadata) =>
  (roots: readonly string[]): readonly CargoPackage[] => {
    const edges = Rec.fromEntries(
      pipe(
        metadata.resolve.nodes,
        Arr.map(
          (node) =>
            [
              node.id,
              pipe(
                node.deps,
                Arr.map(({ pkg }) => pkg),
              ),
            ] as const,
        ),
      ),
    );
    const ids = new Set(reachable(edges, [], roots));
    return pipe(
      metadata.packages,
      Arr.filter((entry) => ids.has(entry.id)),
    );
  };

const ancestorsOf = (directory: string): readonly string[] => {
  const parts = Str.split(directory, SEPARATOR);
  return pipe(
    parts,
    Arr.map((_part, index) => pipe(parts, Arr.take(index + NEXT), Arr.join(SEPARATOR))),
  );
};

export const keysOf = (metadata: CargoMetadata): readonly string[] => {
  const relative = relativeTo(metadata.workspace_root);
  const ignoreFiles = pipe(
    metadata.packages,
    Arr.filter(isLocal),
    Arr.flatMap((entry) => Option.toArray(relative(directoryOf(entry.manifest_path)))),
    Arr.flatMap(ancestorsOf),
    Arr.map((directory) => `${directory}${SEPARATOR}${IGNORE_FILE}`),
  );
  return Arr.sort(Arr.dedupe([LOCK_FILE, MANIFEST_FILE, IGNORE_FILE, ...ignoreFiles]), Str.Order);
};
