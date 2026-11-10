import type { BoothItem } from "@masseater.dev/aredoko-protocol";
import { Effect, Option, Schema, pipe } from "effect";
import { SqlClient } from "effect/sql";

import { kindOf, searchableText } from "#entities/package";
import { decodeRows } from "#shared/sql";

import { embedTexts } from "./embed-texts.ts";
import { labelOf } from "./name.ts";
import { encodeBooth } from "./package-row.ts";

const AssetPathRow = Schema.Struct({
  id: Schema.Int,
  pathname: Schema.String,
  name: Schema.String,
});

type AssetPath = typeof AssetPathRow.Type;

const retext = Effect.fn("retext")(function* retextAsset(
  { id, pathname, name }: AssetPath,
  item: typeof BoothItem.Type,
) {
  const sql = yield* SqlClient.SqlClient;
  const packageName = labelOf({ name, booth: Option.some(item) });
  const text = searchableText({ pathname, kind: kindOf(pathname), packageName });
  yield* sql`update assets set text = ${text} where id = ${id}`;
  yield* sql`delete from text_vectors where rowid = cast(${id} as integer)`;
});

/** @internal */
const linkBooth = Effect.fn("linkBooth")(function* linkBoothItem({
  packageId,
  item,
}: {
  readonly packageId: number;
  readonly item: typeof BoothItem.Type;
}) {
  const sql = yield* SqlClient.SqlClient;
  const stored = yield* encodeBooth(item);
  const rows = yield* decodeRows(AssetPathRow)(
    sql`select a.id, a.pathname, p.name from assets a join packages p on p.id = a.package_id
      where a.package_id = ${packageId}`,
  );
  const retexted = pipe(
    rows,
    Effect.forEach((row) => retext(row, item)),
  );
  yield* sql.withTransaction(
    Effect.andThen(
      sql`update packages set booth_item_id = ${item.id}, booth_item = ${stored}
        where id = ${packageId}`,
      retexted,
    ),
  );
  yield* embedTexts(Option.some(packageId));
});

export { linkBooth };
