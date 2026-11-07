import { NodeServices } from "@effect/platform-node";
import { SqliteClient } from "@effect/sql-sqlite-node";
import { expect, layer } from "@effect/vitest";
import { Array, ConfigProvider, Effect, FileSystem, Layer, Option, Path, pipe } from "effect";
import { SqlClient } from "effect/sql";

import { Blm, blmLayer } from "./blm.ts";

const BOOTH_ID = 1_234_567;
const ITEM_DIRECTORY = "D:/BOOTH";
const NUL = 0;

const utf16 = (text: string): Uint8Array => {
  const ascii = Array.fromIterable(new TextEncoder().encode(text));
  return new Uint8Array(
    pipe(
      ascii,
      Array.flatMap((byte) => [byte, NUL]),
    ),
  );
};

const createTables = Effect.gen(function* createTables() {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`create table preferences (id integer primary key, item_directory_path blob)`;
  yield* sql`create table registered_items (id text primary key, booth_item_id integer)`;
  yield* sql`create table booth_items (id integer primary key, name text, shop_subdomain text)`;
  yield* sql`create table shops (subdomain text primary key, name text)`;
  yield* sql`create table overwritten_booth_items (booth_item_id integer, name text)`;
});

const createBlm = Effect.gen(function* createBlm() {
  const sql = yield* SqlClient.SqlClient;
  yield* createTables;
  yield* sql`insert into preferences (item_directory_path) values (${utf16(`${ITEM_DIRECTORY}\u0000`)})`;
  yield* sql`insert into registered_items values ('a1b2', ${BOOTH_ID}), ('loose', null)`;
  yield* sql`insert into booth_items values (${BOOTH_ID}, 'Original', 'shop')`;
  yield* sql`insert into shops values ('shop', 'Shop Name')`;
  yield* sql`insert into overwritten_booth_items values (${BOOTH_ID}, 'Renamed')`;
});

const blmInTemporaryFolder = Layer.unwrap(
  Effect.gen(function* blmInTemporaryFolder() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const roaming = yield* fileSystem.makeTempDirectoryScoped();
    const folder = path.join(roaming, "pm.booth.library-manager");
    yield* fileSystem.makeDirectory(folder);
    const database = SqliteClient.layer({ filename: path.join(folder, "data.db") });
    const written = Layer.effectDiscard(createBlm).pipe(Layer.provide(database));
    const environment = ConfigProvider.layer(ConfigProvider.fromUnknown({ APPDATA: roaming }));
    return blmLayer.pipe(Layer.provide(environment), Layer.provide(written));
  }),
).pipe(Layer.provideMerge(NodeServices.layer));

layer(blmInTemporaryFolder, { excludeTestServices: true })("Blm", (it) => {
  it.effect("reads the item folder and the BOOTH items registered in it", () =>
    Effect.gen(function* readsItems() {
      const blm = yield* Blm;
      const library = yield* blm.library;
      expect(library).toStrictEqual(
        Option.some({
          itemDirectory: ITEM_DIRECTORY,
          items: [
            {
              folder: "a1b2",
              boothId: BOOTH_ID,
              name: Option.some("Renamed"),
              shop: Option.some("Shop Name"),
            },
          ],
        }),
      );
    }),
  );
});
