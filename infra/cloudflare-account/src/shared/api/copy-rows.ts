import { CloudflareEnvironment } from "@alchemy.run/cloudflare";
import { queryDatabase } from "@distilled.cloud/cloudflare/d1";
import { Array as Arr, Effect, Match, Predicate, Record as Rec, String as Str, pipe } from "effect";

const PAGE_SIZE = 200;
const NONE = 0;
const STATEMENTS_PER_REQUEST = 40;

const TABLES = `select name from sqlite_master
  where type = 'table' and name not like 'sqlite_%' and name not like '_cf_%'
  and name != '__alchemy_migrations' order by name`;

const LINKS = `select m.name as name, f."table" as parent
  from sqlite_master m, pragma_foreign_key_list(m.name) f where m.type = 'table'`;

type Row = Readonly<Record<string, unknown>>;

type Statement = Readonly<{ sql: string; params: readonly unknown[] }>;

type Client = Readonly<{
  rows: (databaseId: string, sql: string) => Effect.Effect<readonly Row[]>;
  insert: (databaseId: string, statements: readonly Statement[]) => Effect.Effect<void>;
}>;

const quoted = (name: string): string => `"${pipe(name, Str.replaceAll('"', '""'))}"`;

const textOf = (row: Row, key: string): string => String(row[key]);

const dependencyOrder = (
  tables: readonly string[],
  parentsOf: (table: string) => readonly string[],
): readonly string[] => {
  const place = (placed: readonly string[], waiting: readonly string[]): readonly string[] => {
    const isReady = (table: string): boolean =>
      Arr.every(parentsOf(table), (parent) => parent === table || Arr.contains(placed, parent));
    const ready = pipe(waiting, Arr.filter(isReady));
    const blocked = pipe(
      waiting,
      Arr.filter((table) => !isReady(table)),
    );
    return Match.value(ready.length).pipe(
      Match.when(NONE, () => [...placed, ...blocked]),
      Match.orElse(() => place([...placed, ...ready], blocked)),
    );
  };
  return place([], tables);
};

const clientOf = Effect.gen(function* clientOf() {
  const { accountId } = yield* yield* CloudflareEnvironment;
  const run = yield* queryDatabase;
  const client: Client = {
    rows: (databaseId, sql) =>
      run({ accountId, databaseId, sql }).pipe(
        Effect.map(({ result }) =>
          pipe(
            result,
            Arr.flatMap(({ results }) => results ?? []),
            Arr.filter(Predicate.isReadonlyObject),
          ),
        ),
        Effect.orDie,
      ),
    insert: (databaseId, statements) =>
      run({
        accountId,
        databaseId,
        batch: pipe(
          statements,
          Arr.map(({ sql, params }) => ({ sql, params: [...params] })),
        ),
      }).pipe(Effect.asVoid, Effect.orDie),
  };
  return client;
});

const insertion = (table: string, row: Row): Statement => {
  const columns = Rec.keys(row);
  const names = pipe(columns, Arr.map(quoted), Arr.join(", "));
  const marks = pipe(
    columns,
    Arr.map(() => "?"),
    Arr.join(", "),
  );
  return {
    sql: `insert into ${quoted(table)} (${names}) values (${marks})`,
    params: pipe(
      columns,
      Arr.map((column) => row[column]),
    ),
  };
};

const countIn = (client: Client, databaseId: string, table: string): Effect.Effect<number> =>
  client
    .rows(databaseId, `select count(*) as count from ${quoted(table)}`)
    .pipe(
      Effect.map((rows) =>
        Arr.match(rows, { onEmpty: () => NONE, onNonEmpty: ([row]) => Number(row["count"]) }),
      ),
    );

const copyPage = (
  client: Client,
  route: Readonly<{ source: string; target: string; table: string }>,
  offset: number,
): Effect.Effect<void> =>
  client
    .rows(
      route.source,
      `select * from ${quoted(route.table)} order by rowid limit ${PAGE_SIZE} offset ${offset}`,
    )
    .pipe(
      Effect.flatMap((rows) =>
        Match.value(rows.length).pipe(
          Match.when(NONE, () => Effect.void),
          Match.orElse(() =>
            Effect.forEach(
              pipe(
                rows,
                Arr.map((row) => insertion(route.table, row)),
                Arr.chunksOf(STATEMENTS_PER_REQUEST),
              ),
              (chunk) => client.insert(route.target, chunk),
              { discard: true, concurrency: 1 },
            ).pipe(Effect.andThen(copyPage(client, route, offset + rows.length))),
          ),
        ),
      ),
    );

const copyTable = Effect.fn("copyTable")(function* copyTable(
  client: Client,
  route: Readonly<{ source: string; target: string; table: string }>,
) {
  const existing = yield* countIn(client, route.target, route.table);
  yield* copyPage(client, route, existing);
  const [expected, actual] = yield* Effect.all(
    [countIn(client, route.source, route.table), countIn(client, route.target, route.table)],
    { concurrency: 1 },
  );
  yield* Match.value(expected === actual).pipe(
    Match.when(true, () => Effect.void),
    Match.orElse(() =>
      Effect.die(`Row count differs in ${route.table}: source ${expected}, target ${actual}`),
    ),
  );
});

/** @internal */
export const copyRows = Effect.fn("copyRows")(function* copyRows(source: string, target: string) {
  const client = yield* clientOf;
  const tableRows = yield* client.rows(source, TABLES);
  const tables = pipe(
    tableRows,
    Arr.map((row) => textOf(row, "name")),
  );
  const links = yield* client.rows(source, LINKS);
  const parentsOf = (table: string): readonly string[] =>
    pipe(
      links,
      Arr.filter((link) => textOf(link, "name") === table),
      Arr.map((link) => textOf(link, "parent")),
    );
  yield* Effect.forEach(
    dependencyOrder(tables, parentsOf),
    (table) => copyTable(client, { source, target, table }),
    { discard: true, concurrency: 1 },
  );
});
