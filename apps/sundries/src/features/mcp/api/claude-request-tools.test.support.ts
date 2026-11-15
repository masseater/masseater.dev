import { makeD1 } from "@masseater.dev/d1-test";
import { constVoid } from "effect/Function";

const MIGRATIONS = new URL("../../../../migrations/", import.meta.url).href;

const d1 = makeD1({ migrations: MIGRATIONS, tables: ["claude_requests"] });

export const { closeDatabase, resetDatabase } = d1;

const ignored = constVoid;

const routine = {
  fire: (): Promise<string> => Promise.resolve("fired"),
  register: (): Promise<boolean> => Promise.resolve(true),
};

export const env = {
  CLAUDE_REQUESTS: d1.env.DB,
  TOOL_CALLS: { writeDataPoint: ignored },
  CLAUDE_ROUTINE: routine,
};
