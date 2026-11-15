import { env } from "cloudflare:workers";
import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Array as Arr, Effect, Option } from "effect";

import { sessions } from "./sessions.table.ts";
import { StoreFailed } from "./store-failed.ts";

export type StoredSession = typeof sessions.$inferInsert;

const failed = (cause: unknown): StoreFailed => StoreFailed.make({ message: String(cause) });

const db = drizzle(env.SESSIONS);

export const listSessions = Effect.tryPromise({
  try: () =>
    db
      .select({
        id: sessions.id,
        startedAt: sessions.startedAt,
        updatedAt: sessions.updatedAt,
        theme: sessions.theme,
        entries: sessions.entries,
      })
      .from(sessions)
      .orderBy(desc(sessions.startedAt)),
  catch: failed,
});

const MEMORY_SESSIONS = 20;

export const allRecords = Effect.tryPromise({
  try: () =>
    db
      .select({ id: sessions.id, record: sessions.record })
      .from(sessions)
      .orderBy(desc(sessions.startedAt)),
  catch: failed,
});

export const recentRecords = Effect.tryPromise({
  try: () =>
    db
      .select({ record: sessions.record })
      .from(sessions)
      .orderBy(desc(sessions.startedAt))
      .limit(MEMORY_SESSIONS),
  catch: failed,
}).pipe(Effect.map(Arr.map(({ record }) => record)));

export const readSession = (id: string): Effect.Effect<Option.Option<string>, StoreFailed> =>
  Effect.tryPromise({
    try: () => db.select({ record: sessions.record }).from(sessions).where(eq(sessions.id, id)),
    catch: failed,
  }).pipe(Effect.map((rows) => Option.map(Arr.head(rows), ({ record }) => record)));

export const storeSession = (session: StoredSession): Effect.Effect<void, StoreFailed> =>
  Effect.tryPromise({
    try: () =>
      db
        .insert(sessions)
        .values(session)
        .onConflictDoUpdate({
          target: sessions.id,
          set: {
            updatedAt: session.updatedAt,
            theme: session.theme,
            entries: session.entries,
            record: session.record,
          },
        }),
    catch: failed,
  }).pipe(Effect.asVoid);
