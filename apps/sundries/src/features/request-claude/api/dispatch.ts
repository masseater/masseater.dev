import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { Array as Arr, Clock, Cron, Duration, Effect, Iterable, Option, pipe } from "effect";

import { enqueueSlots, waitingProjects } from "./claude-requests.ts";
import type { NewRequest, RequestsDb } from "./claude-requests.ts";
import { wakeProject } from "./claude-routine.ts";
import type { RoutineService, Woken } from "./claude-routine.ts";
import { cronOf, enabledSchedules, requestOf } from "./schedules.ts";
import type { Schedule } from "./schedules.ts";

const LOOKBACK_MINUTES = 10;
const REWAKE_MINUTES = 10;
const LOOKBACK = Duration.toMillis(Duration.minutes(LOOKBACK_MINUTES));
const REWAKE = Duration.toMillis(Duration.minutes(REWAKE_MINUTES));
const SENDER = "schedule";
const NO_PROJECT = "-";

type Window = Readonly<{ from: number; until: number }>;

const slotsIn =
  ({ from, until }: Window) =>
  (cron: Cron.Cron): readonly number[] =>
    pipe(
      Cron.sequence(cron, from),
      Iterable.map((date) => date.getTime()),
      Iterable.takeWhile((slot) => slot <= until),
      Arr.fromIterable,
    );

const requestsOf =
  (now: number) =>
  (schedule: Schedule): readonly NewRequest[] => {
    const window = { from: Math.max(now - LOOKBACK, schedule.updatedAt), until: now };
    const slots = pipe(cronOf(schedule), Option.map(slotsIn(window)), Option.getOrElse(Arr.empty));
    return pipe(
      slots,
      Arr.map((slot) => requestOf({ schedule, slot: Option.some(slot), sender: SENDER })),
    );
  };

const wakeLabel =
  (project: Option.Option<string>) =>
  (woke: Woken): string =>
    `${Option.getOrElse(project, () => NO_PROJECT)}:${woke}`;

const wakeWaiting = (
  project: Option.Option<string>,
): Effect.Effect<string, never, RequestsDb | RoutineService> =>
  wakeProject(project).pipe(Effect.map(wakeLabel(project)));

export const dispatchSchedules: Effect.Effect<
  Readonly<{ queued: number; woken: readonly string[] }>,
  UpstreamFailed,
  RequestsDb | RoutineService
> = Effect.gen(function* dispatchSchedules() {
  const now = yield* Clock.currentTimeMillis;
  const schedules = yield* enabledSchedules;
  const due = pipe(schedules, Arr.flatMap(requestsOf(now)));
  const queued = yield* enqueueSlots(due);
  const projects = yield* waitingProjects(now - REWAKE);
  const woken = yield* Effect.forEach(projects, wakeWaiting, { concurrency: 1 });
  return { queued, woken };
});
