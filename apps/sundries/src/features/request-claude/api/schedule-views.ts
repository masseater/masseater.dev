import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import type { ScheduleRun, ScheduleView } from "@masseater.dev/portal-protocol";
import { Array as Arr, Clock, Effect, Option, pipe } from "effect";

import { lastRuns } from "./claude-requests.ts";
import type { ClaudeRequest, RequestsDb } from "./claude-requests.ts";
import { allSchedules, nextRun } from "./schedules.ts";
import type { Schedule } from "./schedules.ts";

const runOf = (request: ClaudeRequest): ScheduleRun => ({
  id: request.id,
  slot: request.slot,
  createdAt: request.createdAt,
  takenAt: request.takenAt,
  repliedAt: request.repliedAt,
  threadUrl: request.threadUrl,
  reply: request.reply,
});

const viewOf =
  ({ runs, now }: Readonly<{ runs: readonly ClaudeRequest[]; now: number }>) =>
  (schedule: Schedule): ScheduleView => ({
    id: schedule.id,
    name: schedule.name,
    description: schedule.description,
    cron: schedule.cron,
    timezone: schedule.timezone,
    project: schedule.project,
    model: schedule.model,
    prompt: schedule.prompt,
    enabled: schedule.enabled,
    updatedAt: schedule.updatedAt,
    nextRun: pipe(
      nextRun({ schedule, now }),
      Option.filter(() => schedule.enabled),
      Option.getOrNull,
    ),
    lastRun: pipe(
      runs,
      Arr.findFirst((run) => run.scheduleId === schedule.id),
      Option.map(runOf),
      Option.getOrNull,
    ),
  });

export const scheduleViews: Effect.Effect<readonly ScheduleView[], UpstreamFailed, RequestsDb> =
  Effect.all([allSchedules, lastRuns, Clock.currentTimeMillis], { concurrency: 1 }).pipe(
    Effect.map(([schedules, runs, now]) => pipe(schedules, Arr.map(viewOf({ runs, now })))),
  );
