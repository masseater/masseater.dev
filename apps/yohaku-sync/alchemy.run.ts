import { D1, Workers } from "@alchemy.run/cloudflare";
import type { InferEnv } from "@alchemy.run/cloudflare";
import { ownerAccess } from "@masseater.dev/cloudflare-account/owner-access";
import { tracedStackProps } from "@masseater.dev/cloudflare-account/traced-providers";
import { SYNC_HOST } from "@masseater.dev/yohaku-protocol/sync";
import { Stack } from "alchemy";
import { Effect } from "effect";

import { APP_NAME, PREFIX, requireAppPrefix } from "./app-name.ts";

const worker = Effect.gen(function* worker() {
  const DB = yield* D1.Database("Documents", { migrations: "./migrations" });
  return yield* Workers.Worker("Sync", {
    name: `${PREFIX}worker`,
    main: "./sync.worker.ts",
    logpush: true,
    domain: SYNC_HOST,
    workersDev: false,
    env: { DB },
  });
});

type SyncEnv = InferEnv<typeof worker>;

export type { SyncEnv };
export default Stack(
  APP_NAME,
  tracedStackProps,
  Effect.gen(function* stack() {
    yield* ownerAccess({
      id: "SyncAccess",
      name: `${PREFIX}access`,
      host: SYNC_HOST,
      loopbackClients: true,
    });
    const { url } = yield* worker;
    yield* requireAppPrefix;
    return { url };
  }),
);
