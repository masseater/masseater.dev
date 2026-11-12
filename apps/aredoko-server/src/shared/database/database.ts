import { sqliteLayer } from "@masseater.dev/local-server/node";
import { Effect, Layer } from "effect";
import { getLoadablePath } from "sqlite-vec";

import { Settings } from "#shared/settings";

import { migrations } from "./migrations.ts";

/** @internal */
export const databaseLayer = Layer.unwrap(
  Effect.gen(function* database() {
    const { dataDirectory } = yield* Settings;
    return sqliteLayer({
      directory: dataDirectory,
      file: "aredoko.db",
      migrations,
      extensions: [getLoadablePath()],
    });
  }),
);
