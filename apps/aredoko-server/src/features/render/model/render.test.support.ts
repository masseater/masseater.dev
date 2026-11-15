import { NodeServices } from "@effect/platform-node";
import { Array, Effect, FileSystem, Layer, Option, Path, Result, Schema, pipe } from "effect";
import { Base64 } from "effect/encoding";
import { SqlClient } from "effect/sql";

import { RENDER, databaseLayer } from "#/shared/database/index.ts";
import { Settings } from "#/shared/settings/index.ts";
import { decodeRows, firstId } from "#/shared/sql/index.ts";
import { writePackage } from "#/shared/unitypackage/index.ts";
import type { LooseFile } from "#/shared/unitypackage/index.ts";

const NO_SIZE = 0;
const FIRST = 0;
const TEXTURE = "wall.png";
const MATERIAL = "wall.mtl";
const MAIN_FILE = Option.getOrNull(Option.none<string>());

const RED_PIXEL = Result.getOrThrow(
  Base64.decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADElEQVQImWP4z8AAAAMBAQCc479ZAAAAAElFTkSuQmCC",
  ),
);

const StateRow = Schema.Struct({ render: Schema.Int, images: Schema.Int });

const encoded = (text: string): Uint8Array => new TextEncoder().encode(text);

/** @internal */
const dataInTemporaryFolder = Layer.unwrap(
  Effect.gen(function* temporaryData() {
    const fileSystem = yield* FileSystem.FileSystem;
    const dataDirectory = yield* fileSystem.makeTempDirectoryScoped();
    const settings = Layer.succeed(Settings, {
      dataDirectory,
      modelDirectory: Option.none<string>(),
      embedderWorker: new URL("file:///unused"),
    });
    return databaseLayer.pipe(Layer.provideMerge(settings));
  }),
).pipe(Layer.provideMerge(NodeServices.layer));

/** @internal */
const stateOf = Effect.fn("stateOf")(function* stateOf(assetId: number) {
  const sql = yield* SqlClient.SqlClient;
  const rows = yield* decodeRows(StateRow)(
    sql`select render, (select count(*) from images where asset_id = a.id) as images
      from assets a where id = ${assetId}`,
  );
  return yield* Effect.fromOption(Array.head(rows));
});

/** @internal */
const addPackage = Effect.fn("addPackage")(function* addPackage(files: readonly LooseFile[]) {
  const sql = yield* SqlClient.SqlClient;
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const folder = yield* fileSystem.makeTempDirectoryScoped();
  const file = path.join(folder, "wall.unitypackage");
  yield* writePackage([], files, file);
  yield* sql`insert into sources(path, kind) values (${folder}, 'folder')`;
  const packageId = yield* firstId(
    sql`insert into packages(source_id, kind, path, name, size, modified_at, summary)
      select id, 'unitypackage', ${file}, 'wall', ${NO_SIZE}, ${NO_SIZE}, '{}'
      from sources where path = ${folder} returning id`,
  );
  return yield* pipe(
    files,
    Effect.forEach(({ guid, pathname }) =>
      firstId(
        sql`insert into assets(package_id, guid, pathname, kind, text, render)
          values (${packageId}, ${guid}, ${pathname}, 'model', ${pathname}, ${RENDER.pending})
          returning id`,
      ),
    ),
  );
});

/** @internal */
const stagingExists = Effect.gen(function* stagingExists() {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const { dataDirectory } = yield* Settings;
  const entries = yield* fileSystem.readDirectory(path.join(dataDirectory, "render"));
  return entries.length > FIRST;
});

export {
  FIRST,
  MAIN_FILE,
  MATERIAL,
  NO_SIZE,
  RED_PIXEL,
  TEXTURE,
  addPackage,
  dataInTemporaryFolder,
  encoded,
  stagingExists,
  stateOf,
};
