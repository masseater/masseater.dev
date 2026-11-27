import { makeD1 } from "@masseater.dev/d1-test";
import { constVoid } from "effect/Function";

const MIGRATIONS = new URL("../../../migrations/", import.meta.url).href;

const d1 = makeD1({ migrations: MIGRATIONS, tables: ["claude_requests"] });

export const { closeDatabase, resetDatabase } = d1;

const ignored = constVoid;

export const wakes: { outcome: string; texts: string[] } = { outcome: "fired", texts: [] };

const routine = {
  fire: (text: string): Promise<string> => {
    wakes.texts.push(text);
    return Promise.resolve(wakes.outcome);
  },
  register: (): Promise<boolean> => Promise.resolve(true),
};

export const env = {
  CLAUDE_REQUESTS: d1.env.DB,
  TOOL_CALLS: { writeDataPoint: ignored },
  CLAUDE_ROUTINE: routine,
};
