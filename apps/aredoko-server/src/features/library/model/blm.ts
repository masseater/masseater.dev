import { SqliteClient } from "@effect/sql-sqlite-node";
import {
  Array,
  Config,
  Context,
  Effect,
  FileSystem,
  Layer,
  Option,
  Path,
  Schema,
  String,
  pipe,
} from "effect";
import { SqlClient } from "effect/sql";

import { decodeRows } from "#shared/sql";

const ROAMING = "APPDATA";
const DATABASE = ["pm.booth.library-manager", "data.db"] as const;
const EVEN = 2;
const NUL = 0;
const HIGH_BYTE = 1;
const NUL_CHARACTER = "\u0000";

const Text = Schema.Union([Schema.String, Schema.Uint8Array]);

const DirectoryRow = Schema.Struct({ item_directory_path: Text });

const ItemRow = Schema.Struct({
  folder: Schema.Union([Schema.String, Schema.Int]),
  booth_id: Schema.Union([Schema.Int, Schema.FiniteFromString]),
  name: Schema.NullOr(Schema.String),
  shop: Schema.NullOr(Schema.String),
});

interface BlmItem {
  readonly folder: string;
  readonly boothId: number;
  readonly name: Option.Option<string>;
  readonly shop: Option.Option<string>;
}

interface BlmLibrary {
  readonly itemDirectory: string;
  readonly items: readonly BlmItem[];
}

class Blm extends Context.Service<
  Blm,
  { readonly library: Effect.Effect<Option.Option<BlmLibrary>> }
>()("aredoko-server/features/library/model/blm") {}

const isUtf16 = (bytes: Uint8Array): boolean =>
  bytes.length % EVEN === NUL && bytes.length > NUL && bytes.at(HIGH_BYTE) === NUL;

const textOf = (value: typeof Text.Type): string => {
  if (typeof value === "string") {
    return value;
  }
  const encoding = pipe(
    Option.liftPredicate(value, isUtf16),
    Option.map(() => "utf-16le"),
    Option.getOrElse(() => "utf8"),
  );
  return pipe(new TextDecoder(encoding).decode(value), String.replaceAll(NUL_CHARACTER, ""));
};

const itemOf = (row: typeof ItemRow.Type): BlmItem => ({
  folder: `${row.folder}`,
  boothId: row.booth_id,
  name: Option.fromNullOr(row.name),
  shop: Option.fromNullOr(row.shop),
});

const readBlm = Effect.fn("readBlm")(function* readBlmDatabase() {
  const sql = yield* SqlClient.SqlClient;
  const directories = yield* decodeRows(DirectoryRow)(
    sql`select item_directory_path from preferences order by id desc limit 1`,
  );
  const rows = yield* decodeRows(ItemRow)(
    sql`select r.id as folder, r.booth_item_id as booth_id,
        coalesce(nullif(o.name, ''), b.name) as name, s.name as shop
      from registered_items r
      left join booth_items b on b.id = r.booth_item_id
      left join shops s on s.subdomain = b.shop_subdomain
      left join overwritten_booth_items o on o.booth_item_id = r.booth_item_id
      where r.booth_item_id is not null`,
  );
  const items = pipe(rows, Array.map(itemOf));
  return pipe(
    Array.head(directories),
    Option.map(({ item_directory_path: directory }): BlmLibrary => ({
      itemDirectory: textOf(directory),
      items,
    })),
  );
});

const databasePath = Effect.gen(function* databasePath() {
  const path = yield* Path.Path;
  const fileSystem = yield* FileSystem.FileSystem;
  const roaming = yield* Config.option(Config.String(ROAMING));
  const candidate = pipe(
    roaming,
    Option.map((directory) => path.join(directory, ...DATABASE)),
  );
  const exists = yield* pipe(
    candidate,
    Option.match({
      onNone: () => Effect.succeed(false),
      onSome: (file) => fileSystem.exists(file).pipe(Effect.orElseSucceed(() => false)),
    }),
  );
  return pipe(
    candidate,
    Option.filter(() => exists),
  );
});

const absent = Layer.succeed(Blm, Blm.of({ library: Effect.succeedNone }));

const reading = Layer.effect(
  Blm,
  Effect.gen(function* makeBlm() {
    const sql = yield* SqlClient.SqlClient;
    const library = readBlm().pipe(
      Effect.provideService(SqlClient.SqlClient, sql),
      Effect.catchCause((cause) =>
        Effect.logDebug("BOOTH Library Manager unreadable", cause).pipe(Effect.as(Option.none())),
      ),
    );
    return Blm.of({ library });
  }),
);

/** @internal */
const blmLayer = Layer.unwrap(
  Effect.gen(function* blm() {
    const file = yield* databasePath;
    return pipe(
      file,
      Option.match({
        onNone: () => absent,
        onSome: (filename) =>
          reading.pipe(
            Layer.provide(SqliteClient.layer({ filename, readonly: true, disableWAL: true })),
            Layer.catchCause(() => absent),
          ),
      }),
    );
  }),
);

export { Blm, blmLayer };
export type { BlmItem, BlmLibrary };
