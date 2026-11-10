import {
  deleteBetaWorkerVersion,
  listBetaWorkerVersions,
} from "@distilled.cloud/cloudflare/workers";
import { DATA_WORKER, YOUTUBE_RETENTION_DAYS } from "@masseater.dev/nimado";
import { Config, Console, DateTime, Effect, Stream, pipe } from "effect";
import { Command } from "effect/cli";

import { expiredVersions } from "./versions.ts";

const pruneVersions = Effect.fn("data.prune")(function* pruneOld() {
  const accountId = yield* Config.String("CLOUDFLARE_ACCOUNT_ID");
  const now = yield* DateTime.now;
  const cutoff = DateTime.formatIso(DateTime.subtract(now, { days: YOUTUBE_RETENTION_DAYS }));
  const versions = yield* Stream.runCollect(
    listBetaWorkerVersions.items({ accountId, workerId: DATA_WORKER }),
  );
  const expired = expiredVersions({ versions, cutoff });
  yield* pipe(
    expired,
    Effect.forEach(({ id }) =>
      deleteBetaWorkerVersion({ accountId, workerId: DATA_WORKER, versionId: id }),
    ),
  );
  yield* Console.log(
    `${DATA_WORKER}: ${versions.length.toString()} 版のうち ${expired.length.toString()} 版を消した`,
  );
});

/** @internal */
const pruneCommand = Command.make("prune", {}, () => pruneVersions());

export { pruneCommand };
