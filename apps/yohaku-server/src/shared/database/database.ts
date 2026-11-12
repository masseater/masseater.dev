import { sqliteLayer } from "@masseater.dev/local-server/node";
import { Effect, Layer } from "effect";

import { Settings } from "#shared/settings";

import { migrations } from "./migrations.ts";

/** @internal */
export const databaseLayer = Layer.unwrap(
  Effect.gen(function* database() {
    const { dataDirectory } = yield* Settings;
    return sqliteLayer({ directory: dataDirectory, file: "yohaku.db", migrations, extensions: [] });
  }),
);
