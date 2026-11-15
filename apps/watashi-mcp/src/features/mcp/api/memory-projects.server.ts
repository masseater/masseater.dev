import { count, desc, eq, max } from "drizzle-orm";
import { Array as Arr, Effect, pipe } from "effect";

import { memory } from "#/features/mcp/model/memory.table";
import type { StorageFailed } from "#/features/mcp/model/storage-failed";
import { db } from "#/shared/db/index.server";

import type { Body } from "./life-record";
import { timeOut } from "./life-time";
import { query } from "./storage.server";

const NOT_RETRACTED = "";

const lastUpdated = max(memory.updatedAt);

const memoryProjects: Effect.Effect<Body, StorageFailed> = query(() =>
  db
    .select({ project: memory.project, memos: count(), updatedAt: lastUpdated })
    .from(memory)
    .where(eq(memory.retractedAt, NOT_RETRACTED))
    .groupBy(memory.project)
    .orderBy(desc(lastUpdated)),
).pipe(
  Effect.map((rows) => ({
    projects: pipe(
      rows,
      Arr.map(({ project, memos, updatedAt }) => ({
        project,
        memos,
        updatedAt: timeOut(updatedAt ?? ""),
      })),
    ),
  })),
);

export { memoryProjects };
