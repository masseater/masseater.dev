import type { MoneyPortalRpc, PortalResult } from "@masseater.dev/portal-protocol";
import { runner } from "@r_masseater/workers-tracing/effect";
import { WorkerEntrypoint } from "cloudflare:workers";
import { Effect, Layer, Logger, Match } from "effect";

import { MONEY_READ } from "#/app/mcp/money-tools.server.ts";
import { services } from "#/entities/ledger/index.server.ts";
import type { Failure, Services } from "#/entities/ledger/index.server.ts";

type Described = Readonly<{ errorTag: string; text: string }>;

const logger = Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]);

const runLogged = runner(Layer.mergeAll(logger, services));

const describe = Match.type<Failure>().pipe(
  Match.tagsExhaustive({
    StorageFailed: ({ message }): Described => ({
      errorTag: "StorageFailed",
      text: `storage failed: ${message}`,
    }),
    InvalidRecord: ({ message }): Described => ({ errorTag: "InvalidRecord", text: message }),
  }),
);

const failedWith = ({ errorTag, text }: Described): Effect.Effect<PortalResult> =>
  Effect.logWarning("money.portal.failed").pipe(
    Effect.annotateLogs({ errorTag }),
    Effect.as<PortalResult>({ status: "failed", errorTag, text }),
  );

const readWith = (input: unknown): Effect.Effect<PortalResult, never, Services> =>
  MONEY_READ.call(input).pipe(
    Effect.mapError(describe),
    Effect.matchEffect({
      onFailure: failedWith,
      onSuccess: (body) => Effect.succeed<PortalResult>({ status: "ok", body }),
    }),
  );

export class MoneyPortal extends WorkerEntrypoint implements MoneyPortalRpc {
  public read(input: unknown): Promise<PortalResult> {
    return runLogged(readWith(input).pipe(Effect.annotateLogs({ entrypoint: this.ctx.props })));
  }
}
