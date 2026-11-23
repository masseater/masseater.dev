import { Effect } from "effect";

import type { GitHubAppEnv } from "#/entities/credential/index.ts";
import { sweepPendingLogins } from "#/features/access-oauth/index.ts";
import { dispatchExposure } from "#/features/mint-github-token/index.ts";
import type { AppStoreEnv } from "#/shared/api/index.ts";

export const hourlyJobs = (env: AppStoreEnv & GitHubAppEnv): Effect.Effect<void> =>
  Effect.andThen(
    Effect.promise(() => dispatchExposure(env)),
    sweepPendingLogins(env),
  );
