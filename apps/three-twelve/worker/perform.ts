import { Array as Arr, DateTime, Effect, Option } from "effect";

import { AUDIO_KEY } from "#config";

import type { LastRunValue } from "./last-run.ts";
import { storedStartAt, storedToken } from "./player-state.ts";
import { runPlayer } from "./run-player.ts";

const failure = (at: number, reason: string): LastRunValue => ({ status: "failed", at, reason });

const playAll = Effect.fn("three-twelve.playAll")(function* playAll(
  state: DurableObjectState,
  at: number,
  request: Readonly<{ token: string; audio: ReadableStream }>,
) {
  const container = yield* Effect.fromOption(Option.fromUndefinedOr(state.container), () =>
    failure(at, "no container is bound"),
  );
  const stored = yield* storedStartAt(state.storage);
  const startAt = Option.getOrElse(stored, () => at);
  const outcomes = yield* runPlayer(container, { ...request, startAt }).pipe(
    Effect.mapError((error) => failure(at, error.message)),
  );
  yield* Effect.logInfo("three-twelve.played").pipe(Effect.annotateLogs({ outcomes }));
  return { status: "done", at, outcomes } satisfies LastRunValue;
});

const perform = Effect.fn("three-twelve.perform")(function* perform(
  state: DurableObjectState,
  audioBucket: R2Bucket,
) {
  const now = yield* DateTime.now;
  const at = DateTime.toEpochMillis(now);
  const token = yield* storedToken(state.storage);
  const audio = yield* Effect.promise(() => audioBucket.get(AUDIO_KEY)).pipe(
    Effect.map(Option.fromNullOr),
  );
  if (Option.isNone(token) || Option.isNone(audio)) {
    const missing = Arr.appendAll(
      Option.match(token, { onNone: () => ["token" as const], onSome: () => [] }),
      Option.match(audio, { onNone: () => ["audio" as const], onSome: () => [] }),
    );
    return { status: "notReady", at, missing } satisfies LastRunValue;
  }
  return yield* playAll(state, at, { token: token.value, audio: audio.value.body });
});

const performLogged = Effect.fn("three-twelve.performLogged")(function* performLogged(
  state: DurableObjectState,
  audioBucket: R2Bucket,
) {
  return yield* perform(state, audioBucket).pipe(
    Effect.tapError((error) =>
      Effect.logError("three-twelve.failed").pipe(Effect.annotateLogs({ error })),
    ),
    Effect.match({ onFailure: (error) => error, onSuccess: (result) => result }),
  );
});

export { performLogged };
