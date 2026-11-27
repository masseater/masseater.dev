import type {
  ClaudeRequest,
  ClaudeRequestsRpc,
} from "@masseater.dev/exposure-protocol/claude-requests";
import { runner } from "@r_masseater/workers-tracing/effect";
import { WorkerEntrypoint } from "cloudflare:workers";
import { Effect, Logger } from "effect";

import { enqueue, provideRequests, wakeProject } from "#/features/request-claude/index.ts";
import type { Woken } from "#/features/request-claude/index.ts";

const runLogged = runner(Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]));

export class ClaudeRequests extends WorkerEntrypoint implements ClaudeRequestsRpc {
  public send(request: ClaudeRequest): Promise<Readonly<{ id: number; woke: Woken }>> {
    return runLogged(
      enqueue(request).pipe(
        Effect.zipWith(wakeProject, ({ id }, woke) => ({ id, woke })),
        Effect.orDie,
        provideRequests(this.env),
        Effect.annotateLogs({ entrypoint: this.ctx.props }),
      ),
    );
  }
}
