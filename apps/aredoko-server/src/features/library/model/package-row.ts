import { BoothItem } from "@masseater.dev/aredoko-protocol";
import type { PackageKind } from "@masseater.dev/aredoko-protocol";
import { Array, Effect, Option, Schema, pipe } from "effect";
import { SqlClient } from "effect/sql";

import { decodeRows, firstId } from "#shared/sql";

type StoredKind = Extract<typeof PackageKind.Type, "unitypackage" | "files">;

interface PackageFile {
  readonly sourceId: number;
  readonly path: string;
  readonly size: number;
  readonly modifiedAt: number;
}

const StoredBooth = Schema.fromJsonString(BoothItem);

const BoothRow = Schema.Struct({ booth_item: Schema.NullOr(StoredBooth) });

const encode = Schema.encodeEffect(StoredBooth);

/** @internal */
const encodeBooth = Effect.fn("encodeBooth")(function* encodeBoothItem(
  item: typeof BoothItem.Type,
) {
  return yield* encode(item);
});

/** @internal */
const boothOf = Effect.fn("boothOf")(function* storedBooth(path: string) {
  const sql = yield* SqlClient.SqlClient;
  const rows = yield* decodeRows(BoothRow)(
    sql`select booth_item from packages where path = ${path}`,
  );
  return pipe(
    Array.head(rows),
    Option.flatMap(({ booth_item: item }) => Option.fromNullOr(item)),
  );
});

/** @internal */
const insertPackage = Effect.fn("insertPackage")(function* insertPackageRow({
  kind,
  file,
  name,
  summary,
  booth,
}: {
  readonly kind: StoredKind;
  readonly file: PackageFile;
  readonly name: string;
  readonly summary: string;
  readonly booth: Option.Option<typeof BoothItem.Type>;
}) {
  const sql = yield* SqlClient.SqlClient;
  const boothId = pipe(
    booth,
    Option.map(({ id }) => id),
    Option.getOrNull,
  );
  const encoded = yield* pipe(booth, Option.map(encodeBooth), Effect.transposeOption);
  const boothJson = Option.getOrNull(encoded);
  yield* sql`delete from packages where path = ${file.path}`;
  return yield* firstId(
    sql`insert into packages(source_id, kind, path, name, size, modified_at, summary,
        booth_item_id, booth_item)
      values (${file.sourceId}, ${kind}, ${file.path}, ${name}, ${file.size},
        ${file.modifiedAt}, ${summary}, ${boothId}, ${boothJson})
      returning id`,
  );
});

export { boothOf, encodeBooth, insertPackage };
export type { PackageFile, StoredKind };
