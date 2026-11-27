import type { PortalResult, WatashiPortalRpc } from "@masseater.dev/portal-protocol";
import { runner } from "@r_masseater/workers-tracing/effect";
import { WorkerEntrypoint } from "cloudflare:workers";
import { Effect, Layer, Logger } from "effect";

import { watashiLayer } from "#/app/mcp/layer.server.ts";
import type { WatashiServices } from "#/app/mcp/layer.server.ts";
import type { ToolFailure } from "#/shared/api/index.ts";

import { memoryProjects, memoryViews } from "./memory-lists.server.ts";
import { conversationRead } from "./portal-conversation.server.ts";
import { lifeRead, memoryRead, memoryWrite, profile } from "./portal-operations.server.ts";
import { settled } from "./portal-settled.server.ts";

export { MoneyPortal } from "./money-portal.server.ts";

const NOT_FOUND = 404;

const logger = Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]);

export class WatashiPortal extends WorkerEntrypoint implements WatashiPortalRpc {
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

  public memoryViews(input: unknown): Promise<PortalResult> {
    return this.run("memory_views", memoryViews(input));
  }

  public profile(): Promise<PortalResult> {
    return this.run("watashi_profile", profile);
  }

  public conversationRead(input: unknown): Promise<PortalResult> {
    return this.run("conversation_read", conversationRead(input));
  }

  private run(
    operation: string,
    effect: Effect.Effect<unknown, ToolFailure, WatashiServices>,
  ): Promise<PortalResult> {
    const layer = Layer.mergeAll(logger, watashiLayer(this.env));
    return effect.pipe(
      settled(operation),
      Effect.annotateLogs({ entrypoint: this.ctx.props }),
      runner(layer),
    );
  }
}

const worker = {
  fetch: (): Response => new Response("Not Found", { status: NOT_FOUND }),
};

export default worker;
