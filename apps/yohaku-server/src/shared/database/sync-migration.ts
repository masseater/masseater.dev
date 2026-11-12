import { Array, Effect, pipe } from "effect";
import { SqlClient } from "effect/sql";

const NOT_APPLYING = "not exists (select 1 from sync_applying)";
const NOW = "cast(unixepoch('subsec') * 1000 as integer)";

const enqueue = (kind: string, id: string): string =>
  `insert into sync_outbox (kind, id, changed_at) values ('${kind}', ${id}, ${NOW})
    on conflict (kind, id) do update set changed_at = excluded.changed_at`;

const keptSource = (row: string): string =>
  `exists (select 1 from sources where id = ${row}.source_id and origin != 'manuscript')`;

const TRIGGERS = [
  ["manuscripts", "insert", "new", NOT_APPLYING, enqueue("manuscript", "new.id")],
  ["manuscripts", "update", "new", NOT_APPLYING, enqueue("manuscript", "new.id")],
  ["manuscripts", "delete", "old", NOT_APPLYING, enqueue("manuscript", "old.id")],
  ["paragraphs", "insert", "new", NOT_APPLYING, enqueue("manuscript", "new.manuscript_id")],
  ["paragraphs", "update", "new", NOT_APPLYING, enqueue("manuscript", "new.manuscript_id")],
  ["paragraphs", "delete", "old", NOT_APPLYING, enqueue("manuscript", "old.manuscript_id")],
  [
    "sources",
    "insert",
    "new",
    `${NOT_APPLYING} and new.origin != 'manuscript'`,
    enqueue("source", "new.id"),
  ],
  [
    "sources",
    "delete",
    "old",
    `${NOT_APPLYING} and old.origin != 'manuscript'`,
    enqueue("source", "old.id"),
  ],
  [
    "facts",
    "insert",
    "new",
    `${NOT_APPLYING} and ${keptSource("new")}`,
    enqueue("source", "new.source_id"),
  ],
  [
    "facts",
    "delete",
    "old",
    `${NOT_APPLYING} and ${keptSource("old")}`,
    enqueue("source", "old.source_id"),
  ],
] as const;

const triggerSql = ([table, event, , condition, action]: (typeof TRIGGERS)[number]): string =>
  `create trigger sync_${table}_${event} after ${event} on ${table} for each row
    when ${condition} begin ${action}; end`;

/** @internal */
export const sync = Effect.gen(function* sync() {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`create table sync_outbox (
    kind text not null,
    id text not null,
    changed_at integer not null,
    primary key (kind, id)
  )`;
  yield* sql`create table sync_state (key text primary key, value text not null)`;
  yield* sql`create table sync_applying (flag integer primary key)`;
  yield* Effect.forEach(
    pipe(TRIGGERS, Array.map(triggerSql)),
    (statement) => sql.unsafe(statement),
    { discard: true },
  );
  yield* sql`insert into sync_outbox (kind, id, changed_at)
    select 'manuscript', id, updated_at from manuscripts`;
  yield* sql`insert into sync_outbox (kind, id, changed_at)
    select 'source', id, created_at from sources where origin != 'manuscript'`;
});
