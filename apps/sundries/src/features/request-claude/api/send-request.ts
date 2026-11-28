import { failedAt } from "@masseater.dev/mcp-tool-call";
import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { Effect, Option, pipe } from "effect";

import { enqueue } from "./claude-requests.ts";
import type { NewRequest, RequestsDb } from "./claude-requests.ts";
import { wakeProject } from "./claude-routine.ts";
import type { RoutineService, Woken } from "./claude-routine.ts";
import { findSchedule, requestOf } from "./schedules.ts";

export type Sent = Effect.Effect<
  Readonly<{ id: number; woke: Woken }>,
  UpstreamFailed,
  RequestsDb | RoutineService
>;

export const sendRequest = (request: NewRequest): Sent =>
  Effect.zipWith(enqueue(request), wakeProject(request.project), ({ id }, woke) => ({ id, woke }));

export const runSchedule = ({ id, sender }: Readonly<{ id: string; sender: string }>): Sent =>
  findSchedule(id).pipe(
    Effect.flatMap((schedule) => sendRequest(requestOf({ schedule, slot: Option.none(), sender }))),
  );

export type SendArgs = Readonly<{ text?: string; schedule?: string; project?: string }>;

export const sendOrRun = ({ input, sender }: Readonly<{ input: SendArgs; sender: string }>): Sent =>
  pipe(
    Option.fromNullishOr(input.schedule),
    Option.map((id) => runSchedule({ id, sender })),
    Option.orElse(() =>
      Option.map(Option.fromNullishOr(input.text), (text) =>
        sendRequest({
          text,
          sender,
          project: Option.fromNullishOr(input.project),
          scheduleId: Option.none(),
          slot: Option.none(),
        }),
      ),
    ),
    Option.getOrElse(() => Effect.fail(failedAt("send_to_claude")("give text or schedule"))),
  );
