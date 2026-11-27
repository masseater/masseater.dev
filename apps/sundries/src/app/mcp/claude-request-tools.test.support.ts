import { makeD1 } from "@masseater.dev/d1-test";
import { Effect } from "effect";

import type { RequestBindings } from "#/features/request-claude/index.ts";

const MIGRATIONS = new URL("../../../migrations/", import.meta.url).href;

const d1 = makeD1({ migrations: MIGRATIONS, tables: ["claude_requests"] });

export const { closeDatabase, resetDatabase } = d1;

const routine: RequestBindings["CLAUDE_ROUTINE"] = {
  fire: () => Promise.resolve("fired"),
  register: () => Promise.resolve(true),
};

export const bindings: Effect.Effect<RequestBindings> = d1.database.pipe(
  Effect.map((database) => ({ CLAUDE_REQUESTS: database, CLAUDE_ROUTINE: routine })),
);
