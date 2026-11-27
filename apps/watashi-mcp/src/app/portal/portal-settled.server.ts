import type { PortalResult } from "@masseater.dev/portal-protocol";
import { Effect } from "effect";

import { describeFailure } from "#/shared/api/index.server.ts";
import type { ToolFailure } from "#/shared/api/index.ts";

type Described = Readonly<{ errorTag: string; text: string }>;

const failedWith =
  (operation: string) =>
  ({ errorTag, text }: Described): Effect.Effect<PortalResult> =>
    Effect.logWarning("watashi.portal.failed").pipe(
      Effect.annotateLogs({ operation, errorTag }),
      Effect.as<PortalResult>({ status: "failed", errorTag, text }),
    );

export const settled =
  (operation: string) =>
  <Services>(
    run: Effect.Effect<unknown, ToolFailure, Services>,
  ): Effect.Effect<PortalResult, never, Services> =>
    run.pipe(
      Effect.mapError(describeFailure),
      Effect.matchEffect({
        onFailure: failedWith(operation),
        onSuccess: (body) => Effect.succeed<PortalResult>({ status: "ok", body }),
      }),
    );
