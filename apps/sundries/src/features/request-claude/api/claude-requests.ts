import { failedAt } from "@masseater.dev/mcp-tool-call";
import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { asc, desc, eq, gt, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { Array as Arr, Clock, Context, Effect, Option, Order } from "effect";

import { claudeRequests } from "./claude-requests.table.ts";

export type ClaudeRequest = typeof claudeRequests.$inferSelect;

export type NewRequest = Readonly<{ text: string; sender: string }>;

export type Reply = Readonly<{ id: number; reply: string; threadUrl: string }>;

export class RequestsDb extends Context.Service<RequestsDb, DrizzleD1Database>()(
  "sundries/features/request-claude/api/claude-requests/RequestsDb",
) {}

export const requestsDbOf = (binding: D1Database): DrizzleD1Database => drizzle(binding);

const PAGE_SIZE = 50;

const failed = failedAt("claude-requests");

const query = Effect.fn("query")(function* query<Row>(
  run: (db: DrizzleD1Database) => Promise<Row>,
) {
  const db = yield* RequestsDb;
  return yield* Effect.tryPromise({ try: () => run(db), catch: failed });
});

export const enqueue = Effect.fn("enqueue")(function* enqueue({ text, sender }: NewRequest) {
  const createdAt = yield* Clock.currentTimeMillis;
  const rows = yield* query((db) =>
    db
      .insert(claudeRequests)
      .values({ text, sender, createdAt })
      .returning({ id: claudeRequests.id }),
  );
  return yield* Effect.fromOption(Arr.head(rows)).pipe(
    Effect.mapError(() => failed("insert returned no row")),
  );
});

export const delivered = (id: number): Effect.Effect<void, UpstreamFailed, RequestsDb> =>
  Clock.currentTimeMillis.pipe(
    Effect.flatMap((takenAt) =>
      query((db) => db.update(claudeRequests).set({ takenAt }).where(eq(claudeRequests.id, id))),
    ),
    Effect.asVoid,
  );

export const take: Effect.Effect<readonly ClaudeRequest[], UpstreamFailed, RequestsDb> =
  Clock.currentTimeMillis.pipe(
    Effect.flatMap((takenAt) =>
      query((db) =>
        db
          .update(claudeRequests)
          .set({ takenAt })
          .where(isNull(claudeRequests.takenAt))
          .returning(),
      ),
    ),
    Effect.map(Arr.sortWith((request: ClaudeRequest) => request.id, Order.Number)),
  );

export const answer = Effect.fn("answer")(function* answer({ id, reply, threadUrl }: Reply) {
  const repliedAt = yield* Clock.currentTimeMillis;
  const rows = yield* query((db) =>
    db
      .update(claudeRequests)
      .set({ reply, repliedAt, threadUrl })
      .where(eq(claudeRequests.id, id))
      .returning({ id: claudeRequests.id }),
  );
  return { id, replied: Arr.isArrayNonEmpty(rows) };
});

const latest = query((db) =>
  db.select().from(claudeRequests).orderBy(desc(claudeRequests.id)).limit(PAGE_SIZE),
);

const after = (id: number): Effect.Effect<readonly ClaudeRequest[], UpstreamFailed, RequestsDb> =>
  query((db) =>
    db
      .select()
      .from(claudeRequests)
      .where(gt(claudeRequests.id, id))
      .orderBy(asc(claudeRequests.id))
      .limit(PAGE_SIZE),
  );

export const listed = (
  from: Option.Option<number>,
): Effect.Effect<readonly ClaudeRequest[], UpstreamFailed, RequestsDb> =>
  Option.match(from, { onNone: () => latest, onSome: after });
