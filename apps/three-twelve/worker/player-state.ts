import { DateTime, Effect, Option, Schema } from "effect";

import { ARM_LEAD } from "#config";

import type { LastRunValue } from "./last-run.ts";
import { playerFailed } from "./player-failed.ts";
import type { PlayerFailed } from "./player-failed.ts";

type PlayerStorage = Readonly<{
  get: (key: string) => Promise<unknown>;
  put: (key: string, value: unknown) => Promise<void>;
  setAlarm: (scheduledTime: number) => Promise<void>;
}>;

const decodeToken = Schema.decodeUnknownEffect(Schema.UndefinedOr(Schema.String));
const decodeTime = Schema.decodeUnknownEffect(Schema.UndefinedOr(Schema.Finite));

const stored = (storage: PlayerStorage, key: string): Effect.Effect<unknown, PlayerFailed> =>
  Effect.tryPromise({ try: () => storage.get(key), catch: playerFailed });

const read = <Value>(
  storage: PlayerStorage,
  key: string,
  decode: (value: unknown) => Effect.Effect<Value | undefined, Schema.SchemaError>,
): Effect.Effect<Option.Option<Value>, PlayerFailed> =>
  stored(storage, key).pipe(
    Effect.flatMap((value) => decode(value).pipe(Effect.mapError(playerFailed))),
    Effect.map(Option.fromUndefinedOr),
  );

const write = (
  storage: PlayerStorage,
  key: string,
  value: unknown,
): Effect.Effect<void, PlayerFailed> =>
  Effect.tryPromise({ try: () => storage.put(key, value), catch: playerFailed });

const storedToken = (storage: PlayerStorage): Effect.Effect<Option.Option<string>, PlayerFailed> =>
  read(storage, "token", decodeToken);

const storeToken = Effect.fn("three-twelve.storeToken")(function* storeToken(
  storage: PlayerStorage,
  token: string,
) {
  yield* write(storage, "token", token);
});

const isStoredToken = Effect.fn("three-twelve.isStoredToken")(function* isStoredToken(
  storage: PlayerStorage,
  token: string,
) {
  const known = yield* storedToken(storage);
  return Option.contains(known, token);
});

const storedStartAt = (
  storage: PlayerStorage,
): Effect.Effect<Option.Option<number>, PlayerFailed> => read(storage, "startAt", decodeTime);

const arm = Effect.fn("three-twelve.arm")(function* arm(storage: PlayerStorage, startAt: number) {
  const now = yield* DateTime.now;
  const wakeAt = DateTime.subtract(DateTime.makeUnsafe(startAt), ARM_LEAD);
  yield* write(storage, "startAt", startAt);
  yield* Effect.tryPromise({
    try: () => storage.setAlarm(DateTime.toEpochMillis(DateTime.max(now, wakeAt))),
    catch: playerFailed,
  });
});

const startedRun = (storage: PlayerStorage): Effect.Effect<Option.Option<number>, PlayerFailed> =>
  read(storage, "runStartedFor", decodeTime);

const storeStartedRun = Effect.fn("three-twelve.storeStartedRun")(function* storeStartedRun(
  storage: PlayerStorage,
  startAt: number,
) {
  yield* write(storage, "runStartedFor", startAt);
});

const lastRun = (storage: PlayerStorage): Effect.Effect<Option.Option<unknown>, PlayerFailed> =>
  stored(storage, "lastRun").pipe(Effect.map(Option.fromUndefinedOr));

const storeLastRun = Effect.fn("three-twelve.storeLastRun")(function* storeLastRun(
  storage: PlayerStorage,
  value: LastRunValue,
) {
  yield* write(storage, "lastRun", value);
});

export {
  arm,
  isStoredToken,
  lastRun,
  startedRun,
  storeLastRun,
  storeStartedRun,
  storeToken,
  storedStartAt,
  storedToken,
};
export type { PlayerStorage };
