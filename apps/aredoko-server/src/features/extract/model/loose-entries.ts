import { Array, Effect, FileSystem, Path, Schema, String, pipe } from "effect";
import { SqlClient } from "effect/sql";

import { bundleFolder, companionsOf, kindOf, partsOf } from "#entities/package";
import { decodeRows } from "#shared/sql";
import type { LooseFile } from "#shared/unitypackage";

const UNITY_ROOT = "Assets/aredoko";
const GUID_LENGTH = 32;
const GUID_START = 0;
const HEX = 16;
const HEX_DIGITS = 2;
const PAD = "0";
const SEPARATOR = "/";

const LooseRow = Schema.Struct({
  file: Schema.String,
  package_path: Schema.String,
  package_name: Schema.String,
});

type Loose = typeof LooseRow.Type;

const encoder = new TextEncoder();

const hexOf = (bytes: Uint8Array): string =>
  pipe(
    globalThis.Array.from(bytes, (byte) =>
      pipe(byte.toString(HEX), String.padStart(HEX_DIGITS, PAD)),
    ),
    Array.join(""),
  );

const guidOf = (pathname: string): Effect.Effect<string> =>
  Effect.promise(() => crypto.subtle.digest("SHA-256", encoder.encode(pathname))).pipe(
    Effect.map((digest) =>
      pipe(hexOf(new Uint8Array(digest)), String.slice(GUID_START, GUID_LENGTH)),
    ),
  );

const unityPath = (packageName: string, relative: string): string =>
  pipe([UNITY_ROOT, packageName, ...partsOf(relative)], Array.join(SEPARATOR));

const looseFile = Effect.fn("looseFile")(function* looseFile(pathname: string, data: Uint8Array) {
  const guid = yield* guidOf(pathname);
  return { guid, pathname, data } satisfies LooseFile;
});

const filesOf = Effect.fn("filesOf")(function* filesOfLoose(loose: Loose) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const folder = yield* bundleFolder(loose.package_path);
  const data = yield* fileSystem.readFile(loose.file);
  const own = yield* looseFile(
    unityPath(loose.package_name, path.relative(folder.path, loose.file)),
    data,
  );
  if (kindOf(loose.file) !== "model") {
    return [own];
  }
  const companions = yield* companionsOf(folder, data);
  const others = yield* pipe(
    companions,
    Effect.forEach(({ name, data: bytes }) =>
      looseFile(unityPath(loose.package_name, name), bytes),
    ),
  );
  return [own, ...others];
});

/** @internal */
const looseEntries = Effect.fn("looseEntries")(function* selectLoose(assetIds: readonly number[]) {
  const sql = yield* SqlClient.SqlClient;
  const rows = yield* Array.match(assetIds, {
    onEmpty: () => Effect.succeed<readonly Loose[]>([]),
    onNonEmpty: (ids) =>
      decodeRows(LooseRow)(
        sql`select a.file, p.path as package_path, p.name as package_name
          from assets a join packages p on p.id = a.package_id
          where p.kind = 'files' and a.file is not null and ${sql.in("a.id", ids)}`,
      ),
  });
  const files = yield* pipe(rows, Effect.forEach(filesOf));
  return pipe(
    Array.flatten(files),
    Array.dedupeWith((left, right) => left.pathname === right.pathname),
  );
});

export { looseEntries };
