import { DateTime, Effect, Option } from "effect";

import { ARM_LEAD } from "#config";

import type { LastRunValue } from "./last-run.ts";

const read = <Value>(
  storage: DurableObjectStorage,
  key: string,
): Effect.Effect<Option.Option<Value>> =>
  Effect.promise(() => storage.get<Value>(key)).pipe(Effect.map(Option.fromUndefinedOr));

const write = (storage: DurableObjectStorage, key: string, value: unknown): Effect.Effect<void> =>
  Effect.promise(() => storage.put(key, value));

const storedToken = (storage: DurableObjectStorage): Effect.Effect<Option.Option<string>> =>
  read<string>(storage, "token");

const storeToken = Effect.fn("three-twelve.storeToken")(function* storeToken(
  storage: DurableObjectStorage,
  token: string,
) {
  yield* write(storage, "token", token);
});

const isStoredToken = Effect.fn("three-twelve.isStoredToken")(function* isStoredToken(
  storage: DurableObjectStorage,
  token: string,
) {
  const stored = yield* storedToken(storage);
  return Option.contains(stored, token);
});

const storedStartAt = (storage: DurableObjectStorage): Effect.Effect<Option.Option<number>> =>
  read<number>(storage, "startAt");

const arm = Effect.fn("three-twelve.arm")(function* arm(
  storage: DurableObjectStorage,
  startAt: number,
) {
  const now = yield* DateTime.now;
  const wakeAt = DateTime.subtract(DateTime.makeUnsafe(startAt), ARM_LEAD);
  yield* write(storage, "startAt", startAt);
  yield* Effect.promise(() => storage.setAlarm(DateTime.toEpochMillis(DateTime.max(now, wakeAt))));
});

const lastRun = (storage: DurableObjectStorage): Effect.Effect<Option.Option<LastRunValue>> =>
  read<LastRunValue>(storage, "lastRun");

const storeLastRun = Effect.fn("three-twelve.storeLastRun")(function* storeLastRun(
  storage: DurableObjectStorage,
  value: LastRunValue,
) {
  yield* write(storage, "lastRun", value);
});

export { arm, isStoredToken, lastRun, storeLastRun, storeToken, storedStartAt, storedToken };
