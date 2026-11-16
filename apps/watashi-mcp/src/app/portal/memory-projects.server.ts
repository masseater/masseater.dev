import { count, desc, eq, max } from "drizzle-orm";
import { Array as Arr, Effect, pipe } from "effect";

import type { Body } from "#/entities/life-record/index.ts";
import { timeOut } from "#/entities/life-record/index.ts";
import { db, query } from "#/shared/db/index.server.ts";
import { memory } from "#/shared/db/index.ts";
import type { StorageFailed } from "#/shared/db/index.ts";

const NOT_RETRACTED = "";

const lastUpdated = max(memory.updatedAt);

export const memoryProjects: Effect.Effect<Body, StorageFailed> = query(() =>
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
