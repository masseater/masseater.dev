import { Effect } from "effect";
import { SqlClient } from "effect/sql";

import { sync } from "./sync-migration.ts";

const manuscripts = Effect.gen(function* manuscripts() {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`create table manuscripts (
    id text primary key,
    title text,
    title_by text,
    created_at integer not null,
    updated_at integer not null
  )`;
  yield* sql`create table paragraphs (
    manuscript_id text not null references manuscripts(id) on delete cascade,
    id text not null,
    position integer not null,
    text text not null,
    primary key (manuscript_id, id)
  )`;
  yield* sql`create table paragraph_kinds (
    text text primary key,
    kind text not null
  )`;
  yield* sql`create table dismissals (
    text text not null,
    rule text not null,
    primary key (text, rule)
  )`;
});

const understanding = Effect.gen(function* understanding() {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`create table sources (
    id text primary key,
    manuscript_id text references manuscripts(id) on delete cascade,
    label text not null,
    origin text not null,
    client text not null,
    created_at integer not null
  )`;
  yield* sql`create table facts (
    id integer primary key,
    source_id text not null references sources(id) on delete cascade,
    kind text not null,
    subject text not null,
    body text not null,
    at text
  )`;
  yield* sql`create index facts_source on facts(source_id)`;
});

const reactions = Effect.gen(function* reactions() {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`create table reactions (
    id integer primary key,
    reaction text not null,
    at integer not null
  )`;
});

/** @internal */
export const migrations = {
  "1_init": Effect.all([manuscripts, understanding, reactions], { discard: true }),
  "2_sync": sync,
};
