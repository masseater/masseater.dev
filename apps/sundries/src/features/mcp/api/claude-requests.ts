import { failedAt } from "@masseater.dev/mcp-tool-call";
import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { env } from "cloudflare:workers";
import { asc, desc, eq, gt, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Array as Arr, Clock, Effect, Option, Order } from "effect";

import { claudeRequests } from "./claude-requests.table";

type ClaudeRequest = typeof claudeRequests.$inferSelect;

type NewRequest = Readonly<{ text: string; sender: string }>;

type Reply = Readonly<{ id: number; reply: string; threadUrl: string }>;

const PAGE_SIZE = 50;

const failed = failedAt("claude-requests");

const db = drizzle(env.CLAUDE_REQUESTS);

const query = <Row>(run: () => Promise<Row>): Effect.Effect<Row, UpstreamFailed> =>
  Effect.tryPromise({ try: run, catch: failed });

const enqueue = ({
  text,
  sender,
}: NewRequest): Effect.Effect<Readonly<{ id: number }>, UpstreamFailed> =>
  Clock.currentTimeMillis.pipe(
    Effect.flatMap((createdAt) =>
      query(() =>
        db
          .insert(claudeRequests)
          .values({ text, sender, createdAt })
          .returning({ id: claudeRequests.id }),
      ),
    ),
    Effect.flatMap((rows) =>
      Effect.fromOption(Arr.head(rows)).pipe(
        Effect.mapError(() => failed("insert returned no row")),
      ),
    ),
  );

const take: Effect.Effect<readonly ClaudeRequest[], UpstreamFailed> = Clock.currentTimeMillis.pipe(
  Effect.flatMap((takenAt) =>
    query(() =>
      db.update(claudeRequests).set({ takenAt }).where(isNull(claudeRequests.takenAt)).returning(),
    ),
  ),
  Effect.map(Arr.sortWith((request: ClaudeRequest) => request.id, Order.Number)),
);

const answer = ({
  id,
  reply,
  threadUrl,
}: Reply): Effect.Effect<Readonly<{ id: number; replied: boolean }>, UpstreamFailed> =>
  Clock.currentTimeMillis.pipe(
    Effect.flatMap((repliedAt) =>
      query(() =>
        db
          .update(claudeRequests)
          .set({ reply, repliedAt, threadUrl })
          .where(eq(claudeRequests.id, id))
          .returning({ id: claudeRequests.id }),
      ),
    ),
    Effect.map((rows) => ({ id, replied: Arr.isArrayNonEmpty(rows) })),
  );

const latest = query(() =>
  db.select().from(claudeRequests).orderBy(desc(claudeRequests.id)).limit(PAGE_SIZE),
);

const after = (id: number): Effect.Effect<readonly ClaudeRequest[], UpstreamFailed> =>
  query(() =>
    db
      .select()
      .from(claudeRequests)
      .where(gt(claudeRequests.id, id))
      .orderBy(asc(claudeRequests.id))
      .limit(PAGE_SIZE),
  );

const listed = (
  from: Option.Option<number>,
): Effect.Effect<readonly ClaudeRequest[], UpstreamFailed> =>
  Option.match(from, { onNone: () => latest, onSome: after });

export { answer, enqueue, listed, take };
export type { ClaudeRequest, NewRequest, Reply };
