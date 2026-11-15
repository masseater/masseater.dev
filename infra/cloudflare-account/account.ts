import { Effect } from "effect";

import { cloudflareReader, webAnalyticsReader } from "./account-readers.ts";
import { logArchive } from "./log-archive.ts";

const accountResources = Effect.fn("accountResources")(function* accountResources(appName: string) {
  yield* logArchive(appName);
  yield* webAnalyticsReader(appName);
  yield* cloudflareReader(appName);
});

export { accountResources };
