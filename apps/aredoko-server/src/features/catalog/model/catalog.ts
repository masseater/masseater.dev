import type { Source } from "@masseater.dev/aredoko-protocol";
import { Array, Effect, Option, Schema, pipe } from "effect";
import { SqlClient } from "effect/sql";

import { EMBEDDING } from "#shared/database";
import { decodeRows } from "#shared/sql";

const SourceRow = Schema.Struct({
  id: Schema.Int,
  path: Schema.String,
  kind: Schema.Literals(["folder", "project"]),
  packages: Schema.Int,
});

const PreviewRow = Schema.Struct({ png: Schema.Uint8Array });

const CountRow = Schema.Struct({ done: Schema.Int, total: Schema.Int });

const TotalRow = Schema.Struct({ total: Schema.Int });

const NOTHING = { done: 0, total: 0 };

const sourcesWhere = Effect.fn("sourcesWhere")(function* selectSources(
  where: Option.Option<string>,
) {
  const sql = yield* SqlClient.SqlClient;
  const path = Option.getOrNull(where);
  return yield* decodeRows(SourceRow)(
    sql`select s.id, s.path, s.kind, (select count(*) from packages p where p.source_id = s.id) as packages
      from sources s where ${path} is null or s.path = ${path} order by s.path`,
  );
});

/** @internal */
const listSources = sourcesWhere(Option.none());

/** @internal */
const addSource = Effect.fn("addSource")(function* insertSource(
  path: string,
  kind: typeof Source.Type.kind,
) {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`insert into sources(path, kind) values (${path}, ${kind}) on conflict(path) do nothing`;
  const sources = yield* sourcesWhere(Option.some(path));
  return yield* Effect.fromOption(Array.head(sources));
});

/** @internal */
const removeSource = Effect.fn("removeSource")(function* deleteSource(id: number) {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`delete from sources where id = ${id}`;
});

/** @internal */
const preview = Effect.fn("preview")(function* selectPreview(assetId: number) {
  const sql = yield* SqlClient.SqlClient;
  const rows = yield* decodeRows(PreviewRow)(
    sql`select png from images where asset_id = ${assetId} order by id limit 1`,
  );
  return yield* pipe(
    Array.head(rows),
    Option.map(({ png }) => png),
    Effect.fromOption,
  );
});

/** @internal */
const progress = Effect.gen(function* countProgress() {
  const sql = yield* SqlClient.SqlClient;
  const [packages = NOTHING] = yield* decodeRows(TotalRow)(
    sql`select count(*) as total from packages`,
  );
  const [images = NOTHING] = yield* decodeRows(CountRow)(
    sql`select coalesce(sum(embedded <> ${EMBEDDING.pending}), 0) as done, count(*) as total from images`,
  );
  return { packages: packages.total, images };
});

export { addSource, listSources, preview, progress, removeSource };
