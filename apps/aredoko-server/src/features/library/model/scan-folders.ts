import { Array, Effect, FileSystem, HashSet, Option, Path, pipe } from "effect";
import { SqlClient } from "effect/sql";

import { isPackage } from "#entities/package";
import { decodeRows } from "#shared/sql";

import { indexBundle, indexPackage } from "./index-package.ts";
import { bundlesIn, statIfPresent } from "./loose-files.ts";
import type { Bundle } from "./loose-files.ts";
import type { PackageFile } from "./package-row.ts";
import { PackageFileRow, SourcePathRow } from "./rows.ts";

type Source = typeof SourcePathRow.Type;

type KnownPackage = typeof PackageFileRow.Type;

type Scanned =
  | { readonly kind: "unitypackage"; readonly file: PackageFile }
  | { readonly kind: "files"; readonly file: Bundle };

interface Listing {
  readonly sourceId: number;
  readonly files: readonly Scanned[];
}

interface ScannedFile {
  readonly path: string;
  readonly done: number;
  readonly total: number;
}

const fileKey = ({
  path,
  size,
  modifiedAt,
}: Readonly<{ path: string; size: number; modifiedAt: number }>): string =>
  `${path}\n${size.toString()}\n${modifiedAt.toString()}`;

const fileOf = Effect.fn("fileOf")(function* statFile({ id, path: root }: Source, name: string) {
  const path = yield* Path.Path;
  const full = path.join(root, name);
  const stat = yield* statIfPresent(full);
  return pipe(
    stat,
    Option.map((found) => ({ sourceId: id, path: full, ...found }) satisfies PackageFile),
  );
});

const filesOf = Effect.fn("filesOf")(function* listPackageFiles(source: Source) {
  const fileSystem = yield* FileSystem.FileSystem;
  const names = yield* fileSystem.readDirectory(source.path, { recursive: true });
  const packages = yield* pipe(
    names,
    Array.filter(isPackage),
    Effect.forEach((name) => fileOf(source, name)),
  );
  const bundles = yield* bundlesIn(source, names);
  return [
    ...pipe(
      Array.getSomes(packages),
      Array.map((file): Scanned => ({ kind: "unitypackage", file })),
    ),
    ...pipe(
      bundles,
      Array.map((file): Scanned => ({ kind: "files", file })),
    ),
  ];
});

/** @internal */
const folderSources = Effect.fn("folderSources")(function* listFolderSources() {
  const sql = yield* SqlClient.SqlClient;
  return yield* decodeRows(SourcePathRow)(sql`select id, path from sources where kind = 'folder'`);
});

const listingOf = Effect.fn("listingOf")(function* listSource(source: Source) {
  return yield* filesOf(source).pipe(
    Effect.map((files) => Option.some<Listing>({ sourceId: source.id, files })),
    Effect.catch((error) =>
      Effect.logWarning("listing failed", source.path, error).pipe(
        Effect.as(Option.none<Listing>()),
      ),
    ),
  );
});

const currentListings = Effect.fn("currentListings")(function* listCurrentSources() {
  const sources = yield* folderSources();
  const listings = yield* pipe(sources, Effect.forEach(listingOf));
  return Array.getSomes(listings);
});

const filesIn = (listings: readonly Listing[]): readonly Scanned[] =>
  pipe(
    listings,
    Array.flatMap(({ files }) => files),
  );

const removeStale = Effect.fn("removeStale")(function* removeStalePackages(
  known: readonly KnownPackage[],
  listings: readonly Listing[],
) {
  const sql = yield* SqlClient.SqlClient;
  const listed = HashSet.fromIterable(
    pipe(
      listings,
      Array.map(({ sourceId }) => sourceId),
    ),
  );
  const present = HashSet.fromIterable(
    pipe(
      filesIn(listings),
      Array.map(({ file: { path } }) => path),
    ),
  );
  const stale = pipe(
    known,
    Array.filter(
      ({ path, source_id: sourceId }) =>
        HashSet.has(listed, sourceId) && !HashSet.has(present, path),
    ),
  );
  yield* pipe(
    stale,
    Effect.forEach(({ id }) => sql`delete from packages where id = ${id}`),
  );
});

const indexScanned = Effect.fn("indexScanned")(function* indexScannedFile(
  scanned: Scanned,
  linkable: (packagePath: string) => boolean,
) {
  if (scanned.kind === "files") {
    return yield* indexBundle(scanned.file, linkable(scanned.file.path));
  }
  return yield* indexPackage(scanned.file, linkable(scanned.file.path));
});

/** @internal */
const scanFolders = Effect.fn("scanFolders")(function* scanSourceFolders(
  onFile: (file: ScannedFile) => Effect.Effect<void>,
  linkable: (packagePath: string) => boolean,
) {
  const sql = yield* SqlClient.SqlClient;
  const listings = yield* currentListings();
  const files = filesIn(listings);
  const known = yield* decodeRows(PackageFileRow)(
    sql`select id, source_id, path, size, modified_at from packages
      where kind in ('unitypackage', 'files')`,
  );
  yield* removeStale(known, listings);
  const unchanged = HashSet.fromIterable(
    pipe(
      known,
      Array.map(({ path, size, modified_at: modifiedAt }) => fileKey({ path, size, modifiedAt })),
    ),
  );
  const changed = pipe(
    files,
    Array.filter(({ file }) => !HashSet.has(unchanged, fileKey(file))),
  );
  yield* pipe(
    changed,
    Effect.forEach((scanned, done) =>
      onFile({ path: scanned.file.path, done, total: changed.length }).pipe(
        Effect.andThen(indexScanned(scanned, linkable)),
        Effect.catchCause((cause) => Effect.logWarning("index failed", scanned.file.path, cause)),
      ),
    ),
  );
});

export { folderSources, scanFolders };
export type { ScannedFile };
