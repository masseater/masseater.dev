import { Array as Arr, Cause, DateTime, Effect, Option } from "effect";

import { AUDIO_KEY } from "#config";

import type { LastRunValue } from "./last-run.ts";
import { PlayerFailed, playerFailed } from "./player-failed.ts";
import {
  startedRun,
  storeLastRun,
  storeStartedRun,
  storedStartAt,
  storedToken,
} from "./player-state.ts";
import type { PlayerStorage } from "./player-state.ts";
import { runPlayer } from "./run-player.ts";
import type { PlayRequest, PlayerContainer } from "./run-player.ts";

const ON_TIME = 0;

type Stage = Readonly<{ storage: PlayerStorage; container?: PlayerContainer }>;

type AudioBucket = Readonly<{
  get: (key: string) => Promise<Readonly<{ body: ReadableStream }> | null>;
}>;

const failure = (at: number, reason: string): LastRunValue => ({ status: "failed", at, reason });

const crash = (at: number, cause: Cause.Cause<never>): LastRunValue =>
  failure(at, String(Cause.squash(cause)));

const playAll = Effect.fn("three-twelve.playAll")(function* playAll(
  stage: Stage,
  at: number,
  request: PlayRequest,
) {
  const container = yield* Effect.fromOption(Option.fromUndefinedOr(stage.container), () =>
    PlayerFailed.make({ message: "no container is bound" }),
  );
  const { readyAt, outcomes } = yield* runPlayer(container, request);
  yield* Effect.logInfo("three-twelve.played").pipe(Effect.annotateLogs({ outcomes }));
  const lateBy = readyAt - request.startAt;
  if (lateBy > ON_TIME) {
    yield* Effect.logWarning("three-twelve.late").pipe(Effect.annotateLogs({ lateBy }));
    return { status: "late", at, lateBy, outcomes } satisfies LastRunValue;
  }
  return { status: "done", at, outcomes } satisfies LastRunValue;
});

const claimRun = Effect.fn("three-twelve.claimRun")(function* claimRun(storage: PlayerStorage) {
  const armed = yield* storedStartAt(storage);
  const startAt = yield* Effect.fromOption(armed, () =>
    PlayerFailed.make({ message: "alarm fired without a start time" }),
  );
  const started = yield* startedRun(storage);
  if (Option.contains(started, startAt)) {
    return yield* PlayerFailed.make({ message: "alarm retried after an interrupted run" });
  }
  yield* storeStartedRun(storage, startAt);
  return startAt;
});

const perform = Effect.fn("three-twelve.perform")(function* perform(
  stage: Stage,
  audioBucket: AudioBucket,
  at: number,
) {
  const startAt = yield* claimRun(stage.storage);
  const token = yield* storedToken(stage.storage);
  const audio = yield* Effect.tryPromise({
    try: () => audioBucket.get(AUDIO_KEY),
    catch: playerFailed,
  }).pipe(Effect.map(Option.fromNullOr));
  if (Option.isNone(token) || Option.isNone(audio)) {
    const missing = Arr.appendAll(
      Option.match(token, { onNone: () => ["token" as const], onSome: () => [] }),
      Option.match(audio, { onNone: () => ["audio" as const], onSome: () => [] }),
    );
    return { status: "notReady", at, missing } satisfies LastRunValue;
  }
  return yield* playAll(stage, at, { token: token.value, audio: audio.value.body, startAt });
});

const alarmed = Effect.fn("three-twelve.alarmed")(function* alarmed(
  stage: Stage,
  audioBucket: AudioBucket,
) {
  const now = yield* DateTime.now;
  const at = DateTime.toEpochMillis(now);
  const result = yield* perform(stage, audioBucket, at).pipe(
    Effect.tapError((error) =>
      Effect.logError("three-twelve.failed").pipe(Effect.annotateLogs({ error })),
    ),
    Effect.match({
      onFailure: (error) => failure(at, error.message),
      onSuccess: (played) => played,
    }),
    Effect.catchCause((cause) =>
      Effect.logError("three-twelve.crashed", cause).pipe(Effect.as(crash(at, cause))),
    ),
  );
  yield* storeLastRun(stage.storage, result).pipe(
    Effect.catchCause((cause) => Effect.logError("three-twelve.lastRunLost", cause)),
  );
});

export { alarmed };
export type { AudioBucket, Stage };
