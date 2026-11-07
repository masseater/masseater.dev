import { Array, Effect, FileSystem, HashSet, Path, pipe } from "effect";
import { SqlClient } from "effect/sql";

import { isPackage } from "#entities/package";
import { decodeRows } from "#shared/sql";

import { statOf } from "./file-stat.ts";
import { indexBundle, indexPackage } from "./index-package.ts";
import { bundlesIn } from "./loose-files.ts";
import type { Bundle } from "./loose-files.ts";
import type { PackageFile } from "./package-row.ts";
import { PackageFileRow, SourcePathRow } from "./rows.ts";

type Source = typeof SourcePathRow.Type;

type KnownPackage = typeof PackageFileRow.Type;

type Scanned =
  | { readonly kind: "unitypackage"; readonly file: PackageFile }
  | { readonly kind: "files"; readonly file: Bundle };

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
  const stat = yield* statOf(full);
  return { sourceId: id, path: full, ...stat } satisfies PackageFile;
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
      packages,
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

const currentFiles = Effect.fn("currentFiles")(function* listCurrentFiles() {
  const sources = yield* folderSources();
  const files = yield* pipe(
    sources,
    Effect.forEach((source) =>
      filesOf(source).pipe(Effect.orElseSucceed((): readonly Scanned[] => [])),
    ),
  );
  return Array.flatten(files);
});

const removeStale = Effect.fn("removeStale")(function* removeStalePackages(
  known: readonly KnownPackage[],
  files: readonly Scanned[],
) {
  const sql = yield* SqlClient.SqlClient;
  const present = HashSet.fromIterable(
    pipe(
      files,
      Array.map(({ file: { path } }) => path),
    ),
  );
  const stale = pipe(
    known,
    Array.filter(({ path }) => !HashSet.has(present, path)),
  );
  yield* pipe(
    stale,
    Effect.forEach(({ id }) => sql`delete from packages where id = ${id}`),
  );
});

const indexScanned = Effect.fn("indexScanned")(function* indexScannedFile(scanned: Scanned) {
  if (scanned.kind === "files") {
    return yield* indexBundle(scanned.file);
  }
  return yield* indexPackage(scanned.file);
});

/** @internal */
const scanFolders = Effect.fn("scanFolders")(function* scanSourceFolders(
  onFile: (file: ScannedFile) => Effect.Effect<void>,
) {
  const sql = yield* SqlClient.SqlClient;
  const files = yield* currentFiles();
  const known = yield* decodeRows(PackageFileRow)(
    sql`select id, path, size, modified_at from packages where kind in ('unitypackage', 'files')`,
  );
  yield* removeStale(known, files);
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
        Effect.andThen(indexScanned(scanned)),
        Effect.catchCause((cause) => Effect.logWarning("index failed", scanned.file.path, cause)),
      ),
    ),
  );
});

export { folderSources, scanFolders };
export type { ScannedFile };
