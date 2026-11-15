import type { MoneyPortalRpc, PortalResult } from "@masseater.dev/portal-protocol";
import { runner } from "@r_masseater/workers-tracing/effect";
import { WorkerEntrypoint } from "cloudflare:workers";
import { Effect, Layer, Logger, Match } from "effect";

import type { Failure, Services } from "./database";
import { readTool } from "./portal-tools";
import { services } from "./tool";

type Described = Readonly<{ errorTag: string; text: string }>;

const logger = Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]);

const runLogged = runner(Layer.mergeAll(logger, services));

const describe = Match.type<Failure>().pipe(
  Match.tagsExhaustive({
    UpstreamFailed: ({ service, message }): Described => ({
      errorTag: "UpstreamFailed",
      text: `${service} failed: ${message}`,
    }),
    Rejected: ({ message }): Described => ({ errorTag: "Rejected", text: message }),
  }),
);

const unknownTool = (tool: string): Described => ({
  errorTag: "UnknownTool",
  text: `${tool} is not a read-only money tool`,
});

const failedWith =
  (tool: string) =>
  ({ errorTag, text }: Described): Effect.Effect<PortalResult> =>
    Effect.logWarning("money.portal.failed").pipe(
      Effect.annotateLogs({ tool, errorTag }),
      Effect.as<PortalResult>({ status: "failed", errorTag, text }),
    );

const readWith = (tool: string, input: unknown): Effect.Effect<PortalResult, never, Services> =>
  Effect.fromOption(readTool(tool)).pipe(
    Effect.mapError(() => unknownTool(tool)),
    Effect.flatMap((defined) => defined.call(input).pipe(Effect.mapError(describe))),
    Effect.matchEffect({
      onFailure: failedWith(tool),
      onSuccess: (body) => Effect.succeed<PortalResult>({ status: "ok", body }),
    }),
  );

class MoneyPortal extends WorkerEntrypoint implements MoneyPortalRpc {
  public read(tool: string, input: unknown): Promise<PortalResult> {
    return runLogged(
      readWith(tool, input).pipe(Effect.annotateLogs({ entrypoint: this.ctx.props })),
    );
  }
}

export { MoneyPortal };
