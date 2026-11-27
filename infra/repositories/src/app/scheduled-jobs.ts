import { Effect } from "effect";

import type { GitHubAppEnv } from "#/entities/credential/index.ts";
import { sweepPendingLogins } from "#/features/access-oauth/index.ts";
import { dispatchExposure } from "#/features/mint-github-token/index.ts";
import { nudgeIdleThreads } from "#/features/nudge-idle-threads/index.ts";
import type { AppStoreEnv, QueuedEnv } from "#/shared/api/index.ts";
import { IDLE_CHECK_CRON } from "#/shared/config/index.ts";

export type Tick = Readonly<{ cron: string; scheduledTime: number }>;

export const isIdleCheck = (tick: Tick): boolean => tick.cron === IDLE_CHECK_CRON;

export const idleCheck = ({
  tick,
  env,
}: Readonly<{ tick: Tick; env: QueuedEnv }>): Effect.Effect<void> =>
  nudgeIdleThreads({ env, scheduledTime: tick.scheduledTime });

export const hourlyJobs = (env: AppStoreEnv & GitHubAppEnv): Effect.Effect<void> =>
  Effect.andThen(
    Effect.promise(() => dispatchExposure(env)),
    sweepPendingLogins(env),
  );
