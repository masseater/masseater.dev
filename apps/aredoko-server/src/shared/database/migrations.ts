import { Effect } from "effect";
import { Migrator, SqlClient } from "effect/sql";

import { VECTOR_DIMENSIONS } from "./vector.ts";

const vectors = Effect.gen(function* vectors() {
  const sql = yield* SqlClient.SqlClient;
  const dimensions = VECTOR_DIMENSIONS.toString();
  yield* sql.unsafe(
    `create virtual table image_vectors using vec0(embedding float[${dimensions}] distance_metric=cosine)`,
  );
  yield* sql.unsafe(
    `create virtual table text_vectors using vec0(embedding float[${dimensions}] distance_metric=cosine)`,
  );
});

const library = Effect.gen(function* library() {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`create table sources (
    id integer primary key,
    path text not null unique,
    kind text not null
  )`;
  yield* sql`create table packages (
    id integer primary key,
    source_id integer not null references sources(id) on delete cascade,
    kind text not null,
    path text not null unique,
    name text not null,
    size integer not null,
    modified_at integer not null,
    summary text not null,
    booth_item_id integer,
    booth_item text
  )`;
});

const assets = Effect.gen(function* assets() {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`create table assets (
    id integer primary key,
    package_id integer not null references packages(id) on delete cascade,
    guid text not null,
    pathname text not null,
    kind text not null,
    text text not null,
    unique (package_id, guid)
  )`;
  yield* sql`create table asset_references (
    asset_id integer not null references assets(id) on delete cascade,
    guid text not null,
    primary key (asset_id, guid)
  )`;
  yield* sql`create trigger assets_vectors after delete on assets begin
    delete from text_vectors where rowid = old.id;
  end`;
});

const images = Effect.gen(function* images() {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`create table images (
    id integer primary key,
    asset_id integer not null references assets(id) on delete cascade,
    png blob not null,
    embedded integer not null default 0
  )`;
  yield* sql`create index images_asset on images(asset_id)`;
  yield* sql`create index images_pending on images(id) where embedded = 0`;
  yield* sql`create trigger images_vectors after delete on images begin
    delete from image_vectors where rowid = old.id;
  end`;
});

const files = Effect.gen(function* files() {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`alter table assets add column file text`;
  yield* sql`alter table assets add column render integer not null default 0`;
  yield* sql`create index assets_render on assets(id) where render = 1`;
});

const settings = Effect.gen(function* settings() {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`create table settings (key text primary key, value text not null)`;
});

const init = Effect.all([vectors, library, assets, images], { discard: true });

/** @internal */
export const loader: Migrator.Loader = Migrator.fromRecord({
  "1_init": init,
  "2_files": files,
  "3_settings": settings,
});
