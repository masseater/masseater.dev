import type { ScheduleView, SchedulesRpc } from "@masseater.dev/portal-protocol";
import { runner } from "@r_masseater/workers-tracing/effect";
import { WorkerEntrypoint } from "cloudflare:workers";
import { Effect, Logger } from "effect";

import { provideRequests, scheduleViews } from "#/features/request-claude/index.ts";

const runLogged = runner(Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]));

export class Schedules extends WorkerEntrypoint implements SchedulesRpc {
  public list(): Promise<readonly ScheduleView[]> {
    return runLogged(
      scheduleViews.pipe(
        Effect.orDie,
        provideRequests(this.env),
        Effect.annotateLogs({ entrypoint: this.ctx.props }),
      ),
    );
  }
}
