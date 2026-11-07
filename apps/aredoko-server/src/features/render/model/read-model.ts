import { Array, Effect, FileSystem, Path, Schema, pipe } from "effect";
import { SqlClient } from "effect/sql";

import { bundleFolder, companionsOf } from "#entities/package";
import { decodeRows } from "#shared/sql";

const MAX_MODEL_BYTES = 134_217_728;

const ModelRow = Schema.Struct({ file: Schema.String, package_path: Schema.String });

const taggedError = Schema.TaggedError;

class ModelTooLarge extends taggedError<ModelTooLarge, { readonly brand: unique symbol }>()(
  "ModelTooLarge",
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

/** @internal */
const readModel = Effect.fn("readModel")(function* readModelFiles(assetId: number) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const { file, package_path: packagePath } = yield* modelOf(assetId);
  const info = yield* fileSystem.stat(file);
  if (globalThis.Number(info.size) > MAX_MODEL_BYTES) {
    return yield* ModelTooLarge.make({ file });
  }
  const model = yield* fileSystem.readFile(file);
  const companions = yield* bundleFolder(packagePath).pipe(
    Effect.flatMap((folder) => companionsOf(folder, model)),
  );
  return {
    model,
    files: pipe(
      companions,
      Array.map(({ name, data }) => ({ name: path.basename(name), data })),
    ),
  };
});

export { readModel };
