import { makeD1 } from "@masseater.dev/d1-test";
import { Effect, Layer } from "effect";

import type { Services } from "#/entities/ledger/index.server.ts";
import { services } from "#/shared/api/index.server.ts";
import { Database, databaseOf } from "#/shared/db/index.server.ts";

const d1 = makeD1({
  migrations: new URL("../../../drizzle/", import.meta.url).href,
  tables: [
    "ledger_transaction",
    "ledger_import",
    "ledger_balance",
    "ledger_category_rule",
    "ledger_account",
  ],
});

export const { closeDatabase, resetDatabase } = d1;

const drizzled = d1.database.pipe(Effect.map(databaseOf));

/** @internal */
export const moneyLayer: Layer.Layer<Services> = Layer.mergeAll(
  services,
  Layer.effect(Database, drizzled),
);
