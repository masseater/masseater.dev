import { encodeJson, failedAt } from "@masseater.dev/mcp-tool-call";
import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { asc, eq } from "drizzle-orm";
import { Array as Arr, Clock, Cron, DateTime, Effect, Option, Result, pipe } from "effect";

import type { CreateSchedule, UpdateSchedule } from "./claude-request-input.ts";
import { query } from "./claude-requests.ts";
import type { NewRequest, RequestsDb } from "./claude-requests.ts";
import { scheduleRevisions, schedules } from "./schedules.table.ts";

export type Schedule = typeof schedules.$inferSelect;

export const DEFAULT_TIME_ZONE = "Asia/Tokyo";

const failed = failedAt("schedules");

export const cronOf = (schedule: Schedule): Option.Option<Cron.Cron> =>
  Result.getSuccess(Cron.parse(schedule.cron, schedule.timezone));

export const nextRun = ({
  schedule,
  now,
}: Readonly<{ schedule: Schedule; now: number }>): Option.Option<number> =>
  Option.map(cronOf(schedule), (cron) => Cron.next(cron, now).getTime());

const slotLabel = (schedule: Schedule, slot: number): string =>
  pipe(
    DateTime.zoneMakeNamed(schedule.timezone),
    Option.map((timeZone) => DateTime.makeZonedUnsafe(slot, { timeZone })),
    Option.match({
      onNone: () => DateTime.formatIso(DateTime.makeUnsafe(slot)),
      onSome: DateTime.formatIsoZoned,
    }),
  );

const lineOf =
  (label: string) =>
  (value: string): string =>
    `${label}: ${value}`;

const textOf = (schedule: Schedule, slot: Option.Option<number>): string => {
  const planned = pipe(
    slot,
    Option.map((at) => slotLabel(schedule, at)),
    Option.map(lineOf("予定")),
    Option.toArray,
  );
  const model = pipe(
    Option.fromNullishOr(schedule.model),
    Option.map(lineOf("モデル")),
    Option.toArray,
  );
  const lines = [
    `定期タスク「${schedule.name}」(${schedule.id})`,
    ...planned,
    ...model,
    "",
    schedule.prompt,
  ];
  return Arr.join(lines, "\n");
};

export const requestOf = ({
  schedule,
  slot,
  sender,
}: Readonly<{ schedule: Schedule; slot: Option.Option<number>; sender: string }>): NewRequest => ({
  text: textOf(schedule, slot),
  sender,
  project: Option.fromNullishOr(schedule.project),
  scheduleId: Option.some(schedule.id),
  slot,
});

export const allSchedules: Effect.Effect<readonly Schedule[], UpstreamFailed, RequestsDb> = query(
  (db) => db.select().from(schedules).orderBy(asc(schedules.id)),
);

export const enabledSchedules: Effect.Effect<readonly Schedule[], UpstreamFailed, RequestsDb> =
  query((db) => db.select().from(schedules).where(eq(schedules.enabled, true)));

export const findSchedule = (id: string): Effect.Effect<Schedule, UpstreamFailed, RequestsDb> =>
  query((db) => db.select().from(schedules).where(eq(schedules.id, id))).pipe(
    Effect.flatMap((rows) =>
      Effect.fromOption(Arr.head(rows)).pipe(Effect.mapError(() => failed(`no schedule ${id}`))),
    ),
  );

const revise = Effect.fn("revise")(function* revise({
  schedule,
  changedBy,
}: Readonly<{ schedule: Schedule; changedBy: string }>) {
  const definition = yield* encodeJson(schedule);
  yield* query((db) =>
    db
      .insert(scheduleRevisions)
      .values({ scheduleId: schedule.id, definition, changedBy, changedAt: schedule.updatedAt }),
  );
  return schedule;
});

const written = ({
  rows,
  id,
}: Readonly<{ rows: readonly Schedule[]; id: string }>): Effect.Effect<Schedule, UpstreamFailed> =>
  Effect.fromOption(Arr.head(rows)).pipe(Effect.mapError(() => failed(`no schedule ${id}`)));

export const createSchedule = Effect.fn("createSchedule")(function* createSchedule({
  input,
  changedBy,
}: Readonly<{ input: CreateSchedule; changedBy: string }>) {
  const now = yield* Clock.currentTimeMillis;
  const rows = yield* query((db) =>
    db
      .insert(schedules)
      .values({
        id: input.id,
        name: input.name,
        description: input.description,
        cron: input.cron,
        timezone: input.timezone ?? DEFAULT_TIME_ZONE,
        project: Option.getOrNull(Option.fromNullishOr(input.project)),
        model: Option.getOrNull(Option.fromNullishOr(input.model)),
        prompt: input.prompt,
        enabled: input.enabled ?? true,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing()
      .returning(),
  );
  const schedule = yield* Effect.fromOption(Arr.head(rows)).pipe(
    Effect.mapError(() => failed(`schedule ${input.id} already exists`)),
  );
  return yield* revise({ schedule, changedBy });
});

export const updateSchedule = Effect.fn("updateSchedule")(function* updateSchedule({
  input: { id, ...changes },
  changedBy,
}: Readonly<{ input: UpdateSchedule; changedBy: string }>) {
  const updatedAt = yield* Clock.currentTimeMillis;
  const rows = yield* query((db) =>
    db
      .update(schedules)
      .set({ ...changes, updatedAt })
      .where(eq(schedules.id, id))
      .returning(),
  );
  const schedule = yield* written({ rows, id });
  return yield* revise({ schedule, changedBy });
});
