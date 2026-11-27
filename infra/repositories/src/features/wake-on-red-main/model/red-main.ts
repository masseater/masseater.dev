import { Array as Arr, Boolean as Bool, Clock, Duration, Effect, Option } from "effect";

import type { Claims } from "#/entities/credential/index.ts";
import { queueRequest, readRow, swapRow } from "#/shared/api/index.ts";
import type { QueuedEnv } from "#/shared/api/index.ts";

const SENDER = "main-red";
const QUIET_FOR = Duration.toMillis(Duration.fromInputUnsafe("30 minutes"));

export type Wake = Readonly<{ env: QueuedEnv; claims: typeof Claims.Type }>;

const runUrl = (claims: typeof Claims.Type): string =>
  `https://github.com/${claims.repository}/actions/runs/${claims.run_id}`;

export const message = (claims: typeof Claims.Type): string =>
  Arr.join(
    [
      `${claims.repository} の main の verify が失敗した。`,
      "fix-red-main スキルに従って、緑に戻るまで進める。",
      `失敗した実行: ${runUrl(claims)}`,
    ],
    "\n",
  );

const isQuiet = (previous: Option.Option<string>, now: number): boolean =>
  Option.match(previous, {
    onNone: () => false,
    onSome: (woken) => now - Number(woken) < QUIET_FOR,
  });

export const wake = ({ env, claims }: Wake): Effect.Effect<Response> =>
  Effect.gen(function* wakeClaude() {
    const name = `red_main_woken:${claims.repository_id}`;
    const now = yield* Clock.currentTimeMillis;
    const previous = yield* readRow({ env, name });
    const claimed = yield* Bool.match(isQuiet(previous, now), {
      onTrue: () => Effect.succeed(false),
      onFalse: () => swapRow({ env, name, expected: previous, value: String(now) }),
    });
    yield* Effect.when(
      queueRequest({ env, request: { text: message(claims), sender: SENDER } }),
      Effect.succeed(claimed),
    );
    yield* Effect.logInfo("red_main.woken").pipe(
      Effect.annotateLogs({ repository: claims.repository, woken: claimed }),
    );
    return Response.json({ woken: claimed });
  });
