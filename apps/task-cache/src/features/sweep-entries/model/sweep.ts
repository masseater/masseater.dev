import { Array as Arr, Effect, pipe } from "effect";

import {
  REMOVED_AT_ONCE,
  oldest,
  olderThan,
  remove,
  sizeOf,
  storedBytes,
} from "#/entities/entry/index.ts";
import type { Sized } from "#/entities/entry/index.ts";
import { forgetPastDays } from "#/entities/spending/index.ts";
import { Limits, SECONDS_PER_DAY } from "#/shared/config/index.ts";
import { nowSeconds } from "#/shared/lib/clock.ts";

const NOTHING = 0;
const EXTRA_ROUNDS = 20;
const NO_ENTRIES: readonly Sized[] = [];

const leading = (candidates: readonly Sized[], surplus: number): readonly Sized[] => {
  const freedBefore = Arr.scan(candidates, NOTHING, (bytes, entry) => bytes + sizeOf(entry));
  return pipe(
    Arr.zip(candidates, freedBefore),
    Arr.takeWhile(([, freed]) => freed < surplus),
    Arr.map(([entry]) => entry),
  );
};

const overBudget = Effect.gen(function* overBudget() {
  const limits = yield* Limits;
  const total = yield* storedBytes;
  if (total <= limits.storedBytes) {
    return NO_ENTRIES;
  }
  const candidates = yield* oldest;
  return leading(candidates, total - limits.storedBytes);
});

const sweepOnce = Effect.gen(function* sweepOnce() {
  const { retentionDays } = yield* Limits;
  const now = yield* nowSeconds;
  const expired = yield* olderThan(now - retentionDays * SECONDS_PER_DAY);
  yield* remove(expired);
  const surplus = yield* overBudget;
  yield* remove(surplus);
  return expired.length + surplus.length;
});

export const sweep = Effect.gen(function* sweep() {
  yield* forgetPastDays;
  const removed = yield* Effect.repeat(sweepOnce, {
    times: EXTRA_ROUNDS,
    while: (count) => count >= REMOVED_AT_ONCE,
  });
  yield* Effect.logInfo("cache.swept").pipe(Effect.annotateLogs({ removed }));
});
