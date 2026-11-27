import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import {
  Array as Arr,
  Effect,
  FileSystem,
  ManagedRuntime,
  Path,
  String as Str,
  pipe,
} from "effect";
import type { PlatformError } from "effect/PlatformError";
import { Miniflare } from "miniflare";

export type Source = Readonly<{ migrations: string; tables: readonly string[] }>;

export type Database = Awaited<ReturnType<Miniflare["getD1Database"]>>;

export type D1 = Readonly<{
  database: Effect.Effect<Database>;
  resetDatabase: Effect.Effect<void>;
  closeDatabase: Effect.Effect<void>;
}>;

const services = ManagedRuntime.make(nodeServices);

const BINDING = "DB";
const BREAKPOINT = "--> statement-breakpoint";
const EMPTY_WORKER = "export default { fetch: () => new Response(null) };";

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
    (items) => Effect.forEach(items, readMigration, { concurrency: 1 }),
  );
  return pipe(files, Arr.flatMap(statementsIn));
});

const runAll = (database: Database, statements: readonly string[]): Effect.Effect<void> =>
  Effect.forEach(statements, (sql) => Effect.promise(() => database.prepare(sql).run()), {
    concurrency: 1,
    discard: true,
  });

const deletions = (tables: readonly string[]): readonly string[] =>
  pipe(
    tables,
    Arr.map((table) => `DELETE FROM ${table}`),
  );

export const makeD1 = (source: Source): D1 => {
  const miniflare = new Miniflare({
    modules: true,
    script: EMPTY_WORKER,
    d1Databases: [BINDING],
  });
  const migrated = Effect.gen(function* migrate() {
    const database = yield* Effect.promise(() => miniflare.getD1Database(BINDING));
    const statements = yield* migrationStatements(source.migrations).pipe(Effect.orDie);
    yield* runAll(database, statements);
    return database;
  });
  const ready = services.runPromise(migrated);
  const database = Effect.promise(() => ready);
  return {
    database,
    resetDatabase: database.pipe(
      Effect.flatMap((found) => runAll(found, deletions(source.tables))),
    ),
    closeDatabase: Effect.promise(() => miniflare.dispose()),
  };
};
