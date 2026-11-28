import { startingPattern } from "@masseater.dev/like-pattern";
import { and, count, desc, eq, like, max, ne } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { Array as Arr, Effect, Schema, pipe } from "effect";

import type { Body } from "#/entities/life-record/index.ts";
import { timeOut } from "#/entities/life-record/index.ts";
import { memoryItem } from "#/entities/memory/index.server.ts";
import type { ToolFailure } from "#/shared/api/index.ts";
import type { Database } from "#/shared/db/index.server.ts";
import { query } from "#/shared/db/index.server.ts";
import { memory } from "#/shared/db/index.ts";
import type { StorageFailed } from "#/shared/db/index.ts";

import { decoded } from "./portal-decode.ts";

const NOT_RETRACTED = "";

const NO_VIEW = "";

const VIEW_LIMIT = 500;

const lastUpdated = max(memory.updatedAt);

const MemoryViewsInput = Schema.Struct({
  prefix: Schema.String.check(Schema.isPattern(/^[a-z0-9-]+$/u)),
});

export const memoryProjects: Effect.Effect<Body, StorageFailed, Database> = query((db) =>
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

const viewsUnder = (prefix: string): SQL | undefined =>
  and(
    like(memory.name, startingPattern(prefix)),
    ne(memory.view, NO_VIEW),
    eq(memory.retractedAt, NOT_RETRACTED),
  );

const viewsOf = ({
  prefix,
}: typeof MemoryViewsInput.Type): Effect.Effect<Body, StorageFailed, Database> =>
  query((db) =>
    db.select().from(memory).where(viewsUnder(prefix)).orderBy(desc(memory.name)).limit(VIEW_LIMIT),
  ).pipe(Effect.map((rows) => ({ items: pipe(rows, Arr.map(memoryItem)) })));

export const memoryViews = (input: unknown): Effect.Effect<Body, ToolFailure, Database> =>
  decoded(MemoryViewsInput)(input).pipe(Effect.flatMap(viewsOf));
