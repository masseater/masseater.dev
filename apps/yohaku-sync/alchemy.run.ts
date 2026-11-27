import { Workers } from "@alchemy.run/cloudflare";
import type { InferEnv } from "@alchemy.run/cloudflare";
import { JAPAN_PLACEMENT } from "@masseater.dev/cloudflare-account/japan";
import { japanDatabase } from "@masseater.dev/cloudflare-account/japan-database";
import { ownerAccess } from "@masseater.dev/cloudflare-account/owner-access";
import { tracedStackProps } from "@masseater.dev/cloudflare-account/traced-providers";
import { SYNC_HOST } from "@masseater.dev/yohaku-protocol/sync";
import { Stack } from "alchemy";
import { Effect, Option } from "effect";

import { APP_NAME, PREFIX, requireAppPrefix } from "./src/shared/config/index.ts";

const worker = Effect.gen(function* worker() {
  const DB = yield* japanDatabase("Documents", { migrations: "./migrations", name: Option.none() });
  return yield* Workers.Worker("Sync", {
    limits: { cpuMs: 200 },
    name: `${PREFIX}worker`,
    main: "./src/app/sync.ts",
    logpush: true,
    placement: JAPAN_PLACEMENT,
    domain: SYNC_HOST,
    workersDev: false,
    env: { DB },
  });
});

export type SyncEnv = InferEnv<typeof worker>;

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
