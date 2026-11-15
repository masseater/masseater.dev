import { makeD1 } from "@masseater.dev/d1-test";
import { constVoid } from "effect/Function";

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

export const env = {
  DB: d1.env.DB,
  TOOL_CALLS: { writeDataPoint: constVoid },
};
