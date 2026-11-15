import type { PortalResult } from "@masseater.dev/portal-protocol";
import { Effect } from "effect";

import type { ToolFailure } from "#/features/mcp/model/tool-failure";

import { describeFailure } from "./tool-call.server";

type Described = Readonly<{ errorTag: string; text: string }>;

const failedWith =
  (operation: string) =>
  ({ errorTag, text }: Described): Effect.Effect<PortalResult> =>
    Effect.logWarning("watashi.portal.failed").pipe(
      Effect.annotateLogs({ operation, errorTag }),
      Effect.as<PortalResult>({ status: "failed", errorTag, text }),
    );

const settled =
  (operation: string) =>
  (run: Effect.Effect<unknown, ToolFailure>): Effect.Effect<PortalResult> =>
    run.pipe(
      Effect.mapError(describeFailure),
      Effect.matchEffect({
        onFailure: failedWith(operation),
        onSuccess: (body) => Effect.succeed<PortalResult>({ status: "ok", body }),
      }),
    );

export { settled };
