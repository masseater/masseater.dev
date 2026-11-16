import type { PortalResult, SlidesRpc } from "@masseater.dev/portal-protocol";
import { runner } from "@r_masseater/workers-tracing/effect";
import { WorkerEntrypoint } from "cloudflare:workers";
import { Effect, Logger, Option } from "effect";

import { searchSlides } from "#/features/slides-search/index.ts";

const runLogged = runner(Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]));

const searched = (query: string, limit: number): Effect.Effect<PortalResult> =>
  searchSlides({ query, limit, deck: Option.none() }).pipe(
    Effect.matchEffect({
      onFailure: ({ message }) =>
        Effect.logWarning("sundries.slides.failed").pipe(
          Effect.annotateLogs({ message }),
          Effect.as<PortalResult>({ status: "failed", errorTag: "UpstreamFailed", text: message }),
        ),
      onSuccess: (slides) => Effect.succeed<PortalResult>({ status: "ok", body: slides }),
    }),
  );

export class Slides extends WorkerEntrypoint implements SlidesRpc {
  public search(query: string, limit: number): Promise<PortalResult> {
    return runLogged(
      searched(query, limit).pipe(Effect.annotateLogs({ entrypoint: this.ctx.props })),
    );
  }
}
