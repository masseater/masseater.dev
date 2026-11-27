import { makeD1 } from "@masseater.dev/d1-test";
import { Effect } from "effect";

import type { RequestBindings } from "#/features/request-claude/index.ts";

const MIGRATIONS = new URL("../../../migrations/", import.meta.url).href;

const d1 = makeD1({ migrations: MIGRATIONS, tables: ["claude_requests"] });

export const { closeDatabase, resetDatabase } = d1;

export const wakes: { outcome: "fired" | "rejected"; count: number } = {
  outcome: "fired",
  count: 0,
};

const routine: RequestBindings["CLAUDE_ROUTINE"] = {
  fire: () => {
    wakes.count += 1;
    return Promise.resolve(wakes.outcome);
  },
  register: () => Promise.resolve(true),
};

export const bindings: Effect.Effect<RequestBindings> = d1.database.pipe(
  Effect.map((database) => ({ CLAUDE_REQUESTS: database, CLAUDE_ROUTINE: routine })),
);
