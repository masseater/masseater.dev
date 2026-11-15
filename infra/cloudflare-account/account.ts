import { Effect } from "effect";

import { cloudflareReader, webAnalyticsReader } from "./account-readers.ts";
import { aiGateway } from "./ai-gateway.ts";
import { logArchive } from "./log-archive.ts";

const accountResources = Effect.fn("accountResources")(function* accountResources(appName: string) {
  yield* logArchive(appName);
  yield* aiGateway;
  yield* webAnalyticsReader(appName);
  yield* cloudflareReader(appName);
});

export { accountResources };
