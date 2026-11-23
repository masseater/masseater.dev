import { env } from "cloudflare:workers";
import { eq, lt, max, min } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Array as Arr, DateTime, Effect, Option } from "effect";

import { objectReads, uploads } from "#/entities/spending/model/spending.table.ts";
import { Limits } from "#/shared/config/index.ts";
import { storeFailed } from "#/shared/lib/store-failed.ts";
import type { StoreFailed } from "#/shared/lib/store-failed.ts";

const LEDGERS = { objectReads, uploads } as const;

const ONCE = 1;

const db = drizzle(env.DB);

const today = DateTime.now.pipe(Effect.map(DateTime.formatIsoDateUtc));

const queried = <Found>(query: () => Promise<Found>): Effect.Effect<Found, StoreFailed> =>
  Effect.tryPromise({ try: query, catch: storeFailed });

type Kind = keyof typeof LEDGERS;

const NOTHING = 0;

const spentBy = Effect.fn("spending.spentBy")(function* spentBy(kind: Kind, day: string) {
  const ledger = LEDGERS[kind];
  const ranges = yield* queried(() =>
    db
      .select({ first: min(ledger.id), newest: max(ledger.id) })
      .from(ledger)
      .where(eq(ledger.day, day)),
  );
  const first = Option.flatMapNullishOr(Arr.head(ranges), (row) => row.first);
  const newest = Option.flatMapNullishOr(Arr.head(ranges), (row) => row.newest);
  return Option.match(Option.all({ newest, first }), {
    onNone: () => NOTHING,
    onSome: (ids) => ids.newest - ids.first + ONCE,
  });
});

const spentToday = Effect.fn("spending.spentToday")(function* spentToday(
  kind: Kind,
  count: number,
  limit: number,
) {
  const day = yield* today;
  const before = yield* spentBy(kind, day);
  if (before + count > limit) {
    return false;
  }
  yield* queried(() => db.insert(LEDGERS[kind]).values(Arr.replicate({ day }, count)));
  const spent = yield* spentBy(kind, day);
  return spent <= limit;
});

export const spendUpload: Effect.Effect<boolean, StoreFailed> = Effect.gen(
  function* spendOneUpload() {
    const { uploadsPerDay } = yield* Limits;
    return yield* spentToday("uploads", ONCE, uploadsPerDay);
  },
);

export const spendObjectReads = (count: number): Effect.Effect<boolean, StoreFailed> =>
  Effect.gen(function* spendReads() {
    const { objectReadsPerDay } = yield* Limits;
    return yield* spentToday("objectReads", count, objectReadsPerDay);
  });

export const forgetPastDays = Effect.gen(function* forgetPastDays() {
  const day = yield* today;
  yield* queried(() => db.delete(uploads).where(lt(uploads.day, day)));
  yield* queried(() => db.delete(objectReads).where(lt(objectReads.day, day)));
});
