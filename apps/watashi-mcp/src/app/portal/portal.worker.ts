import type { PortalResult, WatashiPortalRpc } from "@masseater.dev/portal-protocol";
import { runner } from "@r_masseater/workers-tracing/effect";
import { WorkerEntrypoint } from "cloudflare:workers";
import { Effect, Logger } from "effect";

import type { ToolFailure } from "#/shared/api";

import { memoryProjects } from "./memory-projects.server";
import { conversationRead } from "./portal-conversation.server";
import { lifeRead, memoryRead, memoryWrite, profile } from "./portal-operations.server";
import { settled } from "./portal-settled.server";

const NOT_FOUND = 404;

const runLogged = runner(Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]));

class WatashiPortal extends WorkerEntrypoint implements WatashiPortalRpc {
  public lifeRead(input: unknown): Promise<PortalResult> {
    return this.run("life_read", lifeRead(input));
  }

  public memoryRead(input: unknown): Promise<PortalResult> {
    return this.run("memory_read", memoryRead(input));
  }

  public memoryWrite(input: unknown): Promise<PortalResult> {
    return this.run("memory_write", memoryWrite(input));
  }

  public memoryProjects(): Promise<PortalResult> {
    return this.run("memory_projects", memoryProjects);
  }

  public profile(input: unknown): Promise<PortalResult> {
    return this.run("watashi_profile", profile(input));
  }

  public conversationRead(input: unknown): Promise<PortalResult> {
    return this.run("conversation_read", conversationRead(input));
  }

  private run(
    operation: string,
    effect: Effect.Effect<unknown, ToolFailure>,
  ): Promise<PortalResult> {
    return runLogged(
      settled(operation)(effect).pipe(Effect.annotateLogs({ entrypoint: this.ctx.props })),
    );
  }
}

const worker = {
  fetch: (): Response => new Response("Not Found", { status: NOT_FOUND }),
};

export { WatashiPortal };
export default worker;
