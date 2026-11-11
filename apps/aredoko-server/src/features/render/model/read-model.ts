import { Array, Effect, FileSystem, Option, Path, Schema, pipe } from "effect";
import { SqlClient } from "effect/sql";

import { bundleFolder, companionNamesOf, companionPath } from "#entities/package";
import { decodeRows } from "#shared/sql";

const PART_BYTES = 8_388_608;

const ModelRow = Schema.Struct({ file: Schema.String, package_path: Schema.String });

const taggedError = Schema.TaggedError;

class NotACompanion extends taggedError<NotACompanion, { readonly brand: unique symbol }>()(
  "NotACompanion",
  { file: Schema.String },
) {}

const modelOf = Effect.fn("modelOf")(function* findModel(assetId: number) {
  const sql = yield* SqlClient.SqlClient;
  const rows = yield* decodeRows(ModelRow)(
    sql`select a.file, p.path as package_path from assets a
      join packages p on p.id = a.package_id
      where a.id = ${assetId} and a.file is not null`,
  );
  return yield* Effect.fromOption(Array.head(rows));
});

const sizeOf = Effect.fn("sizeOf")(function* sizeOfFile(file: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const info = yield* fileSystem.stat(file);
  return globalThis.Number(info.size);
});

/** @internal */
const readModel = Effect.fn("readModel")(function* readModelFiles(assetId: number) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const { file, package_path: packagePath } = yield* modelOf(assetId);
  const model = yield* fileSystem.readFile(file);
  const folder = yield* bundleFolder(packagePath);
  const names = yield* companionNamesOf(folder, model);
  const files = yield* pipe(
    names,
    Effect.forEach((name) =>
      sizeOf(path.join(folder.path, name)).pipe(Effect.map((size) => ({ name, size }))),
    ),
  );
  return { size: model.length, files };
});

const partPath = Effect.fn("partPath")(function* partPathOf(assetId: number, file: string | null) {
  const { file: model, package_path: packagePath } = yield* modelOf(assetId);
  if (file === null) {
    return model;
  }
  const folder = yield* bundleFolder(packagePath);
  const companion = yield* companionPath(folder, file);
  return yield* Effect.fromOption(companion).pipe(
    Effect.mapError(() => NotACompanion.make({ file })),
  );
});

/** @internal */
const readModelPart = Effect.fn("readModelPart")(function* readModelFilePart({
  assetId,
  file,
  offset,
}: {
  readonly assetId: number;
  readonly file: string | null;
  readonly offset: number;
}) {
  const fileSystem = yield* FileSystem.FileSystem;
  const target = yield* partPath(assetId, file);
  const data = yield* Effect.scoped(
    Effect.gen(function* readPart() {
      const handle = yield* fileSystem.open(target, { flag: "r" });
      yield* handle.seek(BigInt(offset), "start");
      const read = yield* handle.readAlloc(PART_BYTES);
      return Option.match(read, {
        onNone: () => new Uint8Array(),
        onSome: (bytes) => new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.length),
      });
    }),
  );
  return { data };
});

export { readModel, readModelPart };
