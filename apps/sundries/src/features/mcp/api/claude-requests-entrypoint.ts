import type {
  ClaudeRequest,
  ClaudeRequestsRpc,
} from "@masseater.dev/exposure-protocol/claude-requests";
import { runner } from "@r_masseater/workers-tracing/effect";
import { WorkerEntrypoint } from "cloudflare:workers";
import { Effect, Logger } from "effect";

import { enqueue } from "./claude-requests";
import { wakeProject } from "./claude-routine";
import type { Woken } from "./claude-routine";

const runLogged = runner(Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]));

class ClaudeRequests extends WorkerEntrypoint implements ClaudeRequestsRpc {
  public send(request: ClaudeRequest): Promise<Readonly<{ id: number; woke: Woken }>> {
    return runLogged(
      enqueue(request).pipe(
        Effect.flatMap(({ id }) => wakeProject.pipe(Effect.map((woke) => ({ id, woke })))),
        Effect.orDie,
        Effect.annotateLogs({ entrypoint: this.ctx.props }),
      ),
    );
  }
}

export { ClaudeRequests };
