import { D1, R2, Workers } from "@alchemy.run/cloudflare";
import type { InferEnv } from "@alchemy.run/cloudflare";
import { tracedStackProps } from "@masseater.dev/cloudflare-account/traced-providers";
import { RemovalPolicy, Stack } from "alchemy";
import { Effect, Hash } from "effect";

import {
  APP_NAME,
  CACHE_HOST,
  LIMITS,
  PREFIX,
  SECONDS_PER_DAY,
  requireAppPrefix,
} from "./src/shared/config/index.ts";

const ORPHAN_GRACE_DAYS = 1;
const SWEEP_CRON = "*/30 * * * *";

const LIMITER = Workers.RateLimit("LIMITER", {
  namespaceId: Math.abs(Hash.string(APP_NAME)),
  simple: { limit: LIMITS.requestsPerMinute, period: 60 },
});

const worker = Effect.gen(function* worker() {
  const DB = yield* D1.Database("Index", { migrations: "./drizzle" }).pipe(RemovalPolicy.protect());
  const BUCKET = yield* R2.Bucket("Objects", {
    name: `${PREFIX}objects`,
    lifecycleRules: [
      {
        id: "expire",
        deleteObjectsTransition: {
          condition: {
            type: "Age",
            maxAge: (LIMITS.retentionDays + ORPHAN_GRACE_DAYS) * SECONDS_PER_DAY,
          },
        },
      },
    ],
  }).pipe(RemovalPolicy.protect());
  return yield* Workers.Worker("Cache", {
    limits: { cpuMs: 1000 },
    name: `${PREFIX}worker`,
    main: "./src/app/cache.ts",
    logpush: true,
    domain: CACHE_HOST,
    workersDev: false,
    crons: [SWEEP_CRON],
    env: { DB, BUCKET, LIMITER },
  });
});

export type CacheEnv = InferEnv<typeof worker>;

export default Stack(
  APP_NAME,
  tracedStackProps,
  Effect.gen(function* stack() {
    const { url } = yield* worker;
    yield* requireAppPrefix;
    return { url };
  }),
);
