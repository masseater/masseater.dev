import { SqliteClient, SqliteMigrator } from "@effect/sql-sqlite-node";
import { Effect, FileSystem, Layer, Path } from "effect";
import { SqlClient } from "effect/sql";

import { Settings } from "#shared/settings";

import { loader } from "./migrations.ts";

const DATABASE_FILE = "yohaku.db";

const foreignKeys = Layer.effectDiscard(
  Effect.gen(function* foreignKeys() {
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
      Layer.provideMerge(foreignKeys),
      Layer.provideMerge(client),
    );
  }),
);
