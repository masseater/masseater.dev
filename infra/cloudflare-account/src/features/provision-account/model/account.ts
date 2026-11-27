import { Effect } from "effect";

import { cloudflareReader, provisionBucketMover, webAnalyticsReader } from "#/shared/api/index.ts";

import { logArchive } from "./log-archive.ts";

export const accountResources = Effect.fn("accountResources")(function* accountResources(
  appName: string,
) {
  const mover = yield* provisionBucketMover(appName);
  yield* logArchive(appName, mover);
  yield* webAnalyticsReader(appName);
  yield* cloudflareReader(appName);
});
