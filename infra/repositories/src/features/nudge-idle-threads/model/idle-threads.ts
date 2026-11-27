import { Array as Arr, DateTime, Duration, Effect } from "effect";

import { queueRequest } from "#/shared/api/index.ts";
import type { QueuedEnv } from "#/shared/api/index.ts";
import { IDLE_CHECK_MINUTES } from "#/shared/config/index.ts";

const SENDER = "idle-threads";
const INTERVAL_MILLIS = Duration.toMillis(Duration.minutes(IDLE_CHECK_MINUTES));

export type Check = Readonly<{ env: QueuedEnv; scheduledTime: number }>;

const idleSince = (scheduledTime: number): string =>
  DateTime.formatIso(DateTime.makeUnsafe(scheduledTime - INTERVAL_MILLIS));

export const message = (scheduledTime: number): string =>
  Arr.join(
    [
      "プロジェクトのアイドルスレッドの定期点検が起動した。",
      "push-idle-threads スキルに従って、止まっているスレッドに理由を問い、続けるか終えるかを促す。",
      `idleSince: ${idleSince(scheduledTime)}`,
    ],
    "\n",
  );

export const nudgeIdleThreads = ({ env, scheduledTime }: Check): Effect.Effect<void> =>
  queueRequest({ env, request: { text: message(scheduledTime), sender: SENDER } }).pipe(
    Effect.andThen(Effect.logInfo("idle_threads.queued")),
  );
