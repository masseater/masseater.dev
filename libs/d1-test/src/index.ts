import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  Array as Arr,
  Effect,
  FileSystem,
  Layer,
  ManagedRuntime,
  Option,
  Path,
  String as Str,
  pipe,
} from "effect";
import type { PlatformError } from "effect/PlatformError";
import { SqlClient } from "effect/sql";
import type { SqlError } from "effect/sql/SqlError";

type Params = readonly unknown[];

type Query = Readonly<{ sql: string; params: Params }>;

type Row = Readonly<Record<string, unknown>>;

type Result = Readonly<{ results: readonly Row[]; success: true }>;

type Statement = Readonly<{
  query: Query;
  bind: (...params: Params) => Statement;
  all: () => Promise<Result>;
  first: () => Promise<Row | null>;
  run: () => Promise<Result>;
  raw: () => Promise<readonly (readonly unknown[])[]>;
}>;

type Database = Readonly<{
  prepare: (sql: string) => Statement;
  batch: (statements: readonly Statement[]) => Promise<readonly Result[]>;
}>;

type Source = Readonly<{ migrations: string; tables: readonly string[] }>;

type D1 = Readonly<{
  env: { DB: Database };
  resetDatabase: Effect.Effect<readonly (readonly Row[])[]>;
  closeDatabase: Effect.Effect<void>;
}>;

const BREAKPOINT = "--> statement-breakpoint";

const statementsIn = (sql: string): readonly string[] =>
  pipe(sql, Str.split(BREAKPOINT), Arr.map(Str.trim), Arr.filter(Str.isNonEmpty));

const migrationStatements = Effect.fn("d1Test.migrations")(function* migrationStatements(
  migrations: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const folder = yield* path.fromFileUrl(new URL(migrations));
  const names = yield* fileSystem.readDirectory(folder);
  const readMigration = (name: string): Effect.Effect<string, PlatformError> =>
    fileSystem.readFileString(path.join(folder, name, "migration.sql"));
  const files = yield* pipe(
    names,
    Arr.sortWith((name: string) => name, Str.Order),
    Effect.forEach(readMigration),
  );
  return pipe(files, Arr.flatMap(statementsIn));
});

const plain = (sql: string): Query => ({ sql, params: [] });

const executeAll = (
  queries: readonly Query[],
): Effect.Effect<readonly (readonly Row[])[], SqlError, SqlClient.SqlClient> =>
  Effect.gen(function* runQueries() {
    const client = yield* SqlClient.SqlClient;
    const execute = (query: Query): Effect.Effect<readonly Row[], SqlError> =>
      client.unsafe<Row>(query.sql, query.params);
    return yield* client.withTransaction(pipe(queries, Effect.forEach(execute)));
  });

const plainAll = Arr.map(plain);

const sqlite = SqliteClient.layer({ filename: ":memory:" });

const rowsOf = (query: Query): Effect.Effect<readonly Row[], SqlError, SqlClient.SqlClient> =>
  Effect.gen(function* readRows() {
    const client = yield* SqlClient.SqlClient;
    return yield* client.unsafe<Row>(query.sql, query.params);
  });

const valuesOf = (
  query: Query,
): Effect.Effect<readonly (readonly unknown[])[], SqlError, SqlClient.SqlClient> =>
  Effect.gen(function* readValues() {
    const client = yield* SqlClient.SqlClient;
    return yield* client.unsafe(query.sql, query.params).values;
  });

const resultOf = (results: readonly Row[]): Result => ({ results, success: true });

const queryOf = (statement: Statement): Query => statement.query;

const queriesOf = Arr.map(queryOf);

const resultsOf = Arr.map(resultOf);

const deleteAll = (table: string): Query => plain(`DELETE FROM ${table}`);

const makeD1 = (source: Source): D1 => {
  const migrated = Layer.effectDiscard(
    migrationStatements(source.migrations).pipe(Effect.map(plainAll), Effect.flatMap(executeAll)),
  );
  const runtime = ManagedRuntime.make(
    migrated.pipe(Layer.provideMerge(sqlite), Layer.provide(nodeServices)),
  );
  const statementOf = (query: Query): Statement => ({
    query,
    bind: (...params) => statementOf({ sql: query.sql, params }),
    all: () => runtime.runPromise(rowsOf(query).pipe(Effect.map(resultOf))),
    first: () =>
      runtime.runPromise(
        rowsOf(query).pipe(Effect.map((rows) => Option.getOrNull(Arr.head(rows)))),
      ),
    run: () => runtime.runPromise(rowsOf(query).pipe(Effect.map(resultOf))),
    raw: () => runtime.runPromise(valuesOf(query)),
  });
  const database: Database = {
    prepare: (sql) => statementOf(plain(sql)),
    batch: (statements) =>
      runtime.runPromise(executeAll(queriesOf(statements)).pipe(Effect.map(resultsOf))),
  };
  const resetQueries = pipe(source.tables, Arr.map(deleteAll));
  return {
    env: { DB: database },
    resetDatabase: Effect.promise(() => runtime.runPromise(executeAll(resetQueries))),
    closeDatabase: Effect.promise(() => runtime.dispose()),
  };
};

export { makeD1 };
export type { D1, Database, Params, Query, Result, Row, Source, Statement };
