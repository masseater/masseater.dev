import { SqliteClient, SqliteMigrator } from "@effect/sql-sqlite-node";
import { Effect, FileSystem, Layer, Path } from "effect";
import { SqlClient } from "effect/sql";
import { getLoadablePath } from "sqlite-vec";

import { Settings } from "#shared/settings";

import { loader } from "./migrations.ts";

const DATABASE_FILE = "aredoko.db";

const extensions = Layer.effectDiscard(
  Effect.gen(function* extensions() {
    const client = yield* SqliteClient.SqliteClient;
    yield* client.loadExtension(getLoadablePath());
    const sql = yield* SqlClient.SqlClient;
    yield* sql`pragma foreign_keys = on`;
  }),
);

/** @internal */
export const databaseLayer = Layer.unwrap(
  Effect.gen(function* database() {
    const { dataDirectory } = yield* Settings;
    const path = yield* Path.Path;
    const fs = yield* FileSystem.FileSystem;
    yield* fs.makeDirectory(dataDirectory, { recursive: true });
    const client = SqliteClient.layer({ filename: path.join(dataDirectory, DATABASE_FILE) });
    return SqliteMigrator.layer({ loader }).pipe(
      Layer.provideMerge(extensions),
      Layer.provideMerge(client),
    );
  }),
);
