import { runner } from "@r_masseater/workers-tracing/effect";
import { Effect, Logger } from "effect";
import { status } from "elysia";
import type { ElysiaCustomStatusResponse } from "elysia";

import type { PortalFailed } from "./portal-failed";

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

export const respond = <Body>(
  effect: Effect.Effect<Body, PortalFailed>,
): Promise<Body | UpstreamDown> =>
  runRequest(
    effect.pipe(
      Effect.matchEffect({
        onFailure: downOf,
        onSuccess: (body) => Effect.succeed<Body | UpstreamDown>(body),
      }),
    ),
  );
