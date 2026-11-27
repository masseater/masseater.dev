import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { Array as Arr, Context, Effect, Option } from "effect";

import { sessions } from "#/entities/session/model/sessions.table.ts";
import { StoreFailed } from "#/entities/session/model/store-failed.ts";

export type StoredSession = typeof sessions.$inferInsert;

export class SessionsDb extends Context.Service<SessionsDb, DrizzleD1Database>()(
  "kikite/entities/session/api/session-store/SessionsDb",
) {}

export const sessionsDbOf = (binding: D1Database): DrizzleD1Database => drizzle(binding);

const failed = (cause: unknown): StoreFailed => StoreFailed.make({ message: String(cause) });

const queried = Effect.fn("kikite.sessionsQuery")(function* queried<Found>(
  query: (db: DrizzleD1Database) => Promise<Found>,
) {
  const db = yield* SessionsDb;
  return yield* Effect.tryPromise({ try: () => query(db), catch: failed });
});

export const listSessions = queried((db) =>
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
);

const MEMORY_SESSIONS = 20;

export const allRecords = queried((db) =>
  db
    .select({ id: sessions.id, record: sessions.record })
    .from(sessions)
    .orderBy(desc(sessions.startedAt)),
);

export const recentRecords = queried((db) =>
  db
    .select({ record: sessions.record })
    .from(sessions)
    .orderBy(desc(sessions.startedAt))
    .limit(MEMORY_SESSIONS),
).pipe(Effect.map(Arr.map(({ record }) => record)));

export const readSession = (
  id: string,
): Effect.Effect<Option.Option<string>, StoreFailed, SessionsDb> =>
  queried((db) =>
    db.select({ record: sessions.record }).from(sessions).where(eq(sessions.id, id)),
  ).pipe(Effect.map((rows) => Option.map(Arr.head(rows), ({ record }) => record)));

export const storeSession = (
  session: StoredSession,
): Effect.Effect<void, StoreFailed, SessionsDb> =>
  queried((db) =>
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
  ).pipe(Effect.asVoid);
