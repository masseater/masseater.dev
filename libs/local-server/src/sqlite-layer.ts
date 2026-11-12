import { SqliteClient, SqliteMigrator } from "@effect/sql-sqlite-node";
import { Effect, FileSystem, Layer, Path } from "effect";
import type { PlatformError } from "effect";
import { Migrator, SqlClient } from "effect/sql";
import type { SqlError } from "effect/sql";

type Database = SqliteClient.SqliteClient | SqlClient.SqlClient;
type DatabaseFailure = Migrator.MigrationError | SqlError.SqlError | PlatformError.PlatformError;

const prepared = (extensions: readonly string[]): Layer.Layer<never, SqlError.SqlError, Database> =>
  Layer.effectDiscard(
    Effect.gen(function* prepare() {
      const client = yield* SqliteClient.SqliteClient;
      yield* Effect.forEach(extensions, (extension) => client.loadExtension(extension), {
        discard: true,
      });
      const sql = yield* SqlClient.SqlClient;
      yield* sql`pragma foreign_keys = on`;
    }),
  );

const databaseAt = ({
  directory,
  file,
  migrations,
  extensions,
}: Readonly<{
  directory: string;
  file: string;
  migrations: Readonly<Record<string, Effect.Effect<void, unknown, SqlClient.SqlClient>>>;
  extensions: readonly string[];
}>): Layer.Layer<Database, DatabaseFailure, FileSystem.FileSystem | Path.Path> =>
  Layer.unwrap(
    Effect.gen(function* database() {
      const path = yield* Path.Path;
      const fs = yield* FileSystem.FileSystem;
      yield* fs.makeDirectory(directory, { recursive: true });
      const client = SqliteClient.layer({ filename: path.join(directory, file) });
      return SqliteMigrator.layer({ loader: Migrator.fromRecord({ ...migrations }) }).pipe(
        Layer.provideMerge(prepared(extensions)),
        Layer.provideMerge(client),
      );
    }),
  );

/** @internal */
const sqliteLayer = databaseAt;

export { sqliteLayer };
