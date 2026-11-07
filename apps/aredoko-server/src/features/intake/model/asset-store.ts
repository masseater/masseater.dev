import { Array, Config, Effect, FileSystem, Option, Path, Schema, pipe } from "effect";
import { SqlClient } from "effect/sql";

import { decodeRows } from "#shared/sql";

const CUSTOM_LOCATION = "ASSETSTORE_CACHE_PATH";
const ROAMING = "APPDATA";
const CACHE_FOLDER = "Asset Store-5.x";
const DEFAULT_FOLDER = ["Unity", CACHE_FOLDER] as const;
const SETTING = "asset_store";

const ValueRow = Schema.Struct({ value: Schema.String });

const stored = Effect.gen(function* stored() {
  const sql = yield* SqlClient.SqlClient;
  const rows = yield* decodeRows(ValueRow)(sql`select value from settings where key = ${SETTING}`);
  return pipe(
    Array.head(rows),
    Option.map(({ value }) => value),
  );
});

const candidates = Effect.gen(function* candidates() {
  const path = yield* Path.Path;
  const fromUnity = yield* stored;
  const custom = yield* Config.option(Config.String(CUSTOM_LOCATION));
  const roaming = yield* Config.option(Config.String(ROAMING));
  const fallback = pipe(
    roaming,
    Option.map((directory) => path.join(directory, ...DEFAULT_FOLDER)),
  );
  return pipe(
    [fromUnity, custom, fallback],
    Array.getSomes,
    Array.flatMap((root) => [path.join(root, CACHE_FOLDER), root]),
  );
});

const isFolder = Effect.fn("isFolder")(function* isFolder(candidate: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const info = yield* fileSystem.stat(candidate).pipe(Effect.option);
  return pipe(
    info,
    Option.exists(({ type }) => type === "Directory"),
  );
});

/** @internal */
const findAssetStore = Effect.fn("findAssetStore")(function* findAssetStoreFolder() {
  const found = yield* candidates;
  return yield* Effect.findFirst(found, isFolder);
});

/** @internal */
const rememberAssetStore = Effect.fn("rememberAssetStore")(function* rememberAssetStore(
  location: string,
) {
  const sql = yield* SqlClient.SqlClient;
  yield* sql`insert into settings(key, value) values (${SETTING}, ${location})
    on conflict(key) do update set value = excluded.value`;
});

export { findAssetStore, rememberAssetStore };
