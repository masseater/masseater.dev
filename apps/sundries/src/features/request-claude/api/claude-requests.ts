import { failedAt } from "@masseater.dev/mcp-tool-call";
import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { and, asc, desc, eq, gt, inArray, isNull, lte, max, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { Array as Arr, Clock, Context, Effect, Option, Order, pipe } from "effect";

import { claudeRequests } from "./claude-requests.table.ts";

export type ClaudeRequest = typeof claudeRequests.$inferSelect;

export type NewRequest = Readonly<{
  text: string;
  sender: string;
  project: Option.Option<string>;
  scheduleId: Option.Option<string>;
  slot: Option.Option<number>;
}>;

export type Reply = Readonly<{ id: number; reply: string; threadUrl: string }>;

export class RequestsDb extends Context.Service<RequestsDb, DrizzleD1Database>()(
  "sundries/features/request-claude/api/claude-requests/RequestsDb",
) {}

export const requestsDbOf = (binding: D1Database): DrizzleD1Database => drizzle(binding);

const PAGE_SIZE = 50;

const NONE_QUEUED = 0;

const failed = failedAt("claude-requests");

export const query = Effect.fn("query")(function* query<Row>(
  run: (db: DrizzleD1Database) => Promise<Row>,
) {
  const db = yield* RequestsDb;
  return yield* Effect.tryPromise({ try: () => run(db), catch: failed });
});

const projectIs = (project: Option.Option<string>): SQL =>
  Option.match(project, {
    onNone: () => isNull(claudeRequests.project),
    onSome: (name) => eq(claudeRequests.project, name),
  });

const rowOf = (request: NewRequest, createdAt: number): typeof claudeRequests.$inferInsert => ({
  text: request.text,
  sender: request.sender,
  createdAt,
  project: Option.getOrNull(request.project),
  scheduleId: Option.getOrNull(request.scheduleId),
  slot: Option.getOrNull(request.slot),
});

export const enqueue = Effect.fn("enqueue")(function* enqueue(request: NewRequest) {
  const createdAt = yield* Clock.currentTimeMillis;
  const rows = yield* query((db) =>
    db
      .insert(claudeRequests)
      .values(rowOf(request, createdAt))
      .returning({ id: claudeRequests.id }),
  );
  return yield* Effect.fromOption(Arr.head(rows)).pipe(
    Effect.mapError(() => failed("insert returned no row")),
  );
});

const insertSlots = (
  rows: Arr.NonEmptyReadonlyArray<typeof claudeRequests.$inferInsert>,
): Effect.Effect<number, UpstreamFailed, RequestsDb> =>
  query((db) =>
    db.insert(claudeRequests).values(Arr.copy(rows)).onConflictDoNothing().returning({
      id: claudeRequests.id,
    }),
  ).pipe(Effect.map(Arr.length));

export const enqueueSlots = Effect.fn("enqueueSlots")(function* enqueueSlots(
  requests: readonly NewRequest[],
) {
  const createdAt = yield* Clock.currentTimeMillis;
  const rows = pipe(
    requests,
    Arr.map((request) => rowOf(request, createdAt)),
  );
  return yield* Arr.match(rows, {
    onEmpty: () => Effect.succeed(NONE_QUEUED),
    onNonEmpty: insertSlots,
  });
});

export const take = (
  project: Option.Option<string>,
): Effect.Effect<readonly ClaudeRequest[], UpstreamFailed, RequestsDb> =>
  Clock.currentTimeMillis.pipe(
    Effect.flatMap((takenAt) =>
      query((db) =>
        db
          .update(claudeRequests)
          .set({ takenAt })
          .where(and(isNull(claudeRequests.takenAt), projectIs(project)))
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

const waiting = (wokenBefore: number): SQL | undefined => {
  const untaken = isNull(claudeRequests.takenAt);
  const notWoken = isNull(claudeRequests.wokenAt);
  const wokenLongAgo = lte(claudeRequests.wokenAt, wokenBefore);
  return and(untaken, or(notWoken, wokenLongAgo));
};

const projectOf = ({ project }: Readonly<{ project: string | null }>): Option.Option<string> =>
  Option.fromNullishOr(project);

export const waitingProjects = (
  wokenBefore: number,
): Effect.Effect<readonly Option.Option<string>[], UpstreamFailed, RequestsDb> =>
  query((db) =>
    db
      .selectDistinct({ project: claudeRequests.project })
      .from(claudeRequests)
      .where(waiting(wokenBefore)),
  ).pipe(Effect.map(Arr.map(projectOf)));

export const markWoken = Effect.fn("markWoken")(function* markWoken(
  project: Option.Option<string>,
) {
  const wokenAt = yield* Clock.currentTimeMillis;
  yield* query((db) =>
    db
      .update(claudeRequests)
      .set({ wokenAt })
      .where(and(isNull(claudeRequests.takenAt), projectIs(project))),
  );
});

export type Requests = Effect.Effect<readonly ClaudeRequest[], UpstreamFailed, RequestsDb>;

const scheduleIs = (schedule: Option.Option<string>): SQL | undefined =>
  schedule.pipe(
    Option.map((id) => eq(claudeRequests.scheduleId, id)),
    Option.getOrUndefined,
  );

const latest = (schedule: Option.Option<string>): Requests =>
  query((db) =>
    db
      .select()
      .from(claudeRequests)
      .where(scheduleIs(schedule))
      .orderBy(desc(claudeRequests.id))
      .limit(PAGE_SIZE),
  );

const after =
  (schedule: Option.Option<string>) =>
  (id: number): Requests => {
    const newer = and(gt(claudeRequests.id, id), scheduleIs(schedule));
    return query((db) =>
      db
        .select()
        .from(claudeRequests)
        .where(newer)
        .orderBy(asc(claudeRequests.id))
        .limit(PAGE_SIZE),
    );
  };

export const listed = ({
  from,
  schedule,
}: Readonly<{
  from: Option.Option<number>;
  schedule: Option.Option<string>;
}>): Requests => Option.match(from, { onNone: () => latest(schedule), onSome: after(schedule) });

const fromSchedule = (request: ClaudeRequest): boolean => request.scheduleId !== null;

export const lastRuns: Requests = query((db) => {
  const newest = db
    .select({ id: max(claudeRequests.id) })
    .from(claudeRequests)
    .groupBy(claudeRequests.scheduleId);
  return db.select().from(claudeRequests).where(inArray(claudeRequests.id, newest));
}).pipe(Effect.map(Arr.filter(fromSchedule)));
