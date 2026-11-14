import { makeD1 } from "@masseater.dev/d1-test";
import { constVoid } from "effect/Function";

const MIGRATIONS = new URL("../../../../migrations/", import.meta.url).href;

const d1 = makeD1({ migrations: MIGRATIONS, tables: ["claude_requests"] });

const { closeDatabase, resetDatabase } = d1;

const ignored = constVoid;

const env = { CLAUDE_REQUESTS: d1.env.DB, TOOL_CALLS: { writeDataPoint: ignored } };

export { closeDatabase, env, resetDatabase };
