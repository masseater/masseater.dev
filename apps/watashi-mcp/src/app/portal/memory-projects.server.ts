import { count, desc, eq, max } from "drizzle-orm";
import { Array as Arr, Effect, pipe } from "effect";

import type { Body } from "#/entities/life-record";
import { timeOut } from "#/entities/life-record";
import { memory } from "#/shared/db";
import type { StorageFailed } from "#/shared/db";
import { db, query } from "#/shared/db/index.server";

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
