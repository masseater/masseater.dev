import { BoothItem, PackageKind, Summary } from "@masseater.dev/aredoko-protocol";
import type { Package } from "@masseater.dev/aredoko-protocol";
import { Array, Effect, Option, Record, Schema, pipe } from "effect";
import { SqlClient } from "effect/sql";

import { decodeRows } from "#shared/sql";

import { StoredSummary } from "./summary.ts";

const PackageRow = Schema.Struct({
  id: Schema.Int,
  kind: PackageKind,
  path: Schema.String,
  name: Schema.String,
  assets: Schema.Int,
  summary: Schema.fromJsonString(StoredSummary),
  booth_item: Schema.NullOr(Schema.fromJsonString(BoothItem)),
});

const decodeSummary = Schema.decodeUnknownEffect(Summary);

const countsOf = (counts: Readonly<Record<string, number>>): readonly unknown[] =>
  pipe(
    Record.toEntries(counts),
    Array.map(([kind, count]) => ({ kind, count })),
  );

const toPackage = (
  row: typeof PackageRow.Type,
): Effect.Effect<typeof Package.Type, Schema.SchemaError> =>
  pipe(
    decodeSummary({ ...row.summary, counts: countsOf(row.summary.counts) }),
    Effect.map((summary) => ({
      id: row.id,
      kind: row.kind,
      path: row.path,
      name: row.name,
      assets: row.assets,
      summary,
      booth: row.booth_item,
    })),
  );

/** @internal */
const packagesWhere = Effect.fn("packagesWhere")(function* selectPackages(
  id: Option.Option<number>,
) {
  const sql = yield* SqlClient.SqlClient;
  const filter = Option.getOrNull(id);
  const rows = yield* decodeRows(PackageRow)(
    sql`select p.id, p.kind, p.path, p.name, p.summary, p.booth_item,
        (select count(*) from assets a where a.package_id = p.id) as assets
        from packages p
        where ${filter} is null or p.id = ${filter}
        order by p.name`,
  );
  return yield* pipe(rows, Effect.forEach(toPackage));
});

export { packagesWhere };
