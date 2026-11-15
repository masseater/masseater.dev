import { makeD1 } from "@masseater.dev/d1-test";
import { constVoid } from "effect/Function";

const MIGRATIONS = new URL("../../../../migrations/", import.meta.url).href;

const d1 = makeD1({
  migrations: MIGRATIONS,
  tables: ["transactions", "imports", "balances", "category_rules", "accounts"],
});

export const { closeDatabase, resetDatabase } = d1;

export const env = {
  LEDGER: d1.env.DB,
  TOOL_CALLS: { writeDataPoint: constVoid },
};
