import { Effect } from "effect";

import { spendLimits } from "#/features/cap-spend/index.ts";
import { aiGateway, decisionCaller } from "#/features/provision-ai-gateway/index.ts";
import { logArchiveAlert } from "#/features/watch-log-archive/index.ts";

export { spendLimitProvider } from "#/features/cap-spend/index.ts";

export const zoneResources = Effect.fn("zoneResources")(function* zoneResources(appName: string) {
  yield* aiGateway;
  yield* decisionCaller(appName);
  yield* spendLimits;
  yield* logArchiveAlert(appName);
});
