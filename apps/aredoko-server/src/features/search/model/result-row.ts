import { AssetKind, PackageKind } from "@masseater.dev/aredoko-protocol";
import type { SearchResult } from "@masseater.dev/aredoko-protocol";
import { Array, Effect, HashMap, Option, Schema, pipe } from "effect";
import { SqlClient } from "effect/sql";

import { ASSET_ORDER, EMBEDDING } from "#shared/database";
import { decodeRows, ids as decodeIds } from "#shared/sql";

const ResultRow = Schema.Struct({
  id: Schema.Int,
  guid: Schema.String,
  pathname: Schema.String,
  kind: AssetKind,
  package_id: Schema.Int,
  package_name: Schema.String,
  package_kind: PackageKind,
  images: Schema.Int,
  pending: Schema.Int,
  file: Schema.NullOr(Schema.String),
});

const CountRow = Schema.Struct({ total: Schema.Int });

interface Scope {
  readonly packageId: number | null;
  readonly kinds: readonly string[];
}

const NO_ASSETS = 0;
const NO_SCORE = 0;
const NO_IMAGES = 0;
const NO_SCORES = HashMap.empty<number, number>();

type ResultRecord = typeof ResultRow.Type;

/** @internal */
const scopeOf = Effect.fn("scopeOf")(function* scopeClause({ packageId, kinds }: Scope) {
  const sql = yield* SqlClient.SqlClient;
  const ofKinds = Array.match(kinds, {
    onEmpty: () => sql`1 = 1`,
    onNonEmpty: (nonEmpty) => sql.in("a.kind", nonEmpty),
  });
  return sql`(${packageId} is null or a.package_id = ${packageId}) and ${ofKinds}`;
});

/** @internal */
const scopedPage = Effect.fn("scopedPage")(function* selectScopedPage({
  scope,
  offset,
  limit,
}: {
  readonly scope: Scope;
  readonly offset: number;
  readonly limit: number;
}) {
  const sql = yield* SqlClient.SqlClient;
  const inScope = yield* scopeOf(scope);
  const page = yield* decodeIds(
    sql`select a.id from assets a where ${inScope}
      order by ${sql.literal(ASSET_ORDER)}
      limit ${limit} offset ${offset}`,
  );
  const [counted = { total: NO_ASSETS }] = yield* decodeRows(CountRow)(
    sql`select count(*) as total from assets a where ${inScope}`,
  );
  return { ids: page, total: counted.total };
});

const rowsOf = Effect.fn("rowsOf")(function* selectRows(ids: readonly number[], scope: Scope) {
  const sql = yield* SqlClient.SqlClient;
  const inScope = yield* scopeOf(scope);
  return yield* Array.match(ids, {
    onEmpty: () => Effect.succeed<readonly ResultRecord[]>([]),
    onNonEmpty: (nonEmpty) =>
      decodeRows(ResultRow)(
        sql`select a.id, a.guid, a.pathname, a.kind, a.package_id, p.name as package_name,
          p.kind as package_kind, a.file,
          (select count(*) from images i where i.asset_id = a.id) as images,
          (select count(*) from images i where i.asset_id = a.id and i.embedded = ${EMBEDDING.pending}) as pending
          from assets a join packages p on p.id = a.package_id
          where ${sql.in("a.id", nonEmpty)} and ${inScope}`,
      ),
  });
});

/** @internal */
const rowsInOrder = Effect.fn("rowsInOrder")(function* selectRowsInOrder(
  ids: readonly number[],
  scope: Scope,
) {
  const rows = yield* rowsOf(ids, scope);
  const byId = HashMap.fromIterable(
    pipe(
      rows,
      Array.map((row) => [row.id, row] as const),
    ),
  );
  return pipe(
    ids,
    Array.map((id) => HashMap.get(byId, id)),
    Array.getSomes,
  );
});

const resultOf =
  (scores: HashMap.HashMap<number, number>) =>
  (row: typeof ResultRow.Type): typeof SearchResult.Type => ({
    assetId: row.id,
    guid: row.guid,
    pathname: row.pathname,
    kind: row.kind,
    packageId: row.package_id,
    packageName: row.package_name,
    packageKind: row.package_kind,
    score: pipe(
      HashMap.get(scores, row.id),
      Option.getOrElse(() => NO_SCORE),
    ),
    hasPreview: row.images > NO_IMAGES,
    analyzing: row.pending > NO_IMAGES,
    file: row.file,
  });

/** @internal */
const unscored = resultOf(NO_SCORES);

export { resultOf, rowsInOrder, scopeOf, scopedPage, unscored };
export type { Scope };
