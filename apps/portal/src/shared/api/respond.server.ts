import { runner } from "@r_masseater/workers-tracing/effect";
import { Effect, Logger } from "effect";
import { status } from "elysia";
import type { ElysiaCustomStatusResponse } from "elysia";

import { Upstreams, upstreamsFor } from "./bindings.server.ts";
import type { PortalFailed } from "./portal-failed.ts";

const BAD_GATEWAY = 502;

export type UpstreamDown = ElysiaCustomStatusResponse<
  typeof BAD_GATEWAY,
  Readonly<{ errorTag: string; text: string }>
>;

const runRequest = runner(Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]));

const downOf = ({
  errorTag,
  text,
}: Readonly<Readonly<{ errorTag: string; text: string }>>): Effect.Effect<UpstreamDown> =>
  Effect.logWarning("portal.upstream.failed").pipe(
    Effect.annotateLogs({ errorTag }),
    Effect.as(status(BAD_GATEWAY, { errorTag, text })),
  );

export const respond =
  (request: Request) =>
  <Body>(effect: Effect.Effect<Body, PortalFailed, Upstreams>): Promise<Body | UpstreamDown> => {
    const upstreams = upstreamsFor(request);
    return runRequest(
      effect.pipe(
        Effect.matchEffect({
          onFailure: downOf,
          onSuccess: (body) => Effect.succeed<Body | UpstreamDown>(body),
        }),
        Effect.provideServiceEffect(Upstreams, upstreams),
      ),
    );
  };
