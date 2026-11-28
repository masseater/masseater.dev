import type {
  ClaudeRequest,
  ClaudeRequestsRpc,
} from "@masseater.dev/exposure-protocol/claude-requests";
import { runner } from "@r_masseater/workers-tracing/effect";
import { WorkerEntrypoint } from "cloudflare:workers";
import { Effect, Logger, Option } from "effect";

import {
  dispatchSchedules,
  provideRequests,
  sendRequest,
} from "#/features/request-claude/index.ts";
import type { RequestBindings, Woken } from "#/features/request-claude/index.ts";

const runLogged = runner(Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]));

export class ClaudeRequests extends WorkerEntrypoint implements ClaudeRequestsRpc {
  public send(request: ClaudeRequest): Promise<Readonly<{ id: number; woke: Woken }>> {
    return runLogged(
      sendRequest({
        ...request,
        project: Option.none(),
        scheduleId: Option.none(),
        slot: Option.none(),
      }).pipe(
        Effect.orDie,
        provideRequests(this.env),
        Effect.annotateLogs({ entrypoint: this.ctx.props }),
      ),
    );
  }
}

export const dispatch = (env: RequestBindings): Promise<void> =>
  runLogged(
    dispatchSchedules.pipe(
      Effect.flatMap((outcome) =>
        Effect.logInfo("schedules.dispatched").pipe(Effect.annotateLogs(outcome)),
      ),
      Effect.catchCause((cause) => Effect.logError("schedules.dispatch_failed", cause)),
      provideRequests(env),
    ),
  );
