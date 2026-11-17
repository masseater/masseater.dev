import { env } from "cloudflare:workers";
import { eq, lt, min } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { Array as Arr, DateTime, Effect, Option } from "effect";

import { objectReads, uploads } from "#/entities/spending/model/spending.table.ts";
import { LIMITS } from "#/shared/config/index.ts";
import { StoreFailed, storeFailed } from "#/shared/lib/store-failed.ts";

const LEDGERS = { objectReads, uploads } as const;

const ONCE = 1;

const db = drizzle(env.DB);

const today = DateTime.now.pipe(Effect.map(DateTime.formatIsoDateUtc));

const queried = <Found>(query: () => Promise<Found>): Effect.Effect<Found, StoreFailed> =>
  Effect.tryPromise({ try: query, catch: storeFailed });

const missing = Effect.fail(StoreFailed.make({ message: "spending row missing" }));

const spentToday = Effect.fn("spending.spentToday")(function* spentToday(
  kind: keyof typeof LEDGERS,
  count: number,
) {
  const ledger = LEDGERS[kind];
  const day = yield* today;
  const rows = Arr.replicate({ day }, count);
  const added = yield* queried(() => db.insert(ledger).values(rows).returning({ id: ledger.id }));
  const firsts = yield* queried(() =>
    db
      .select({ id: min(ledger.id) })
      .from(ledger)
      .where(eq(ledger.day, day)),
  );
  const newest = Option.map(Arr.last(added), (row) => row.id);
  const first = Option.flatMapNullishOr(Arr.head(firsts), (row) => row.id);
  return yield* Option.match(Option.all({ newest, first }), {
    onNone: () => missing,
    onSome: (ids) => Effect.succeed(ids.newest - ids.first + ONCE),
  });
});

export const spendUpload: Effect.Effect<boolean, StoreFailed> = spentToday("uploads", ONCE).pipe(
  Effect.map((spent) => spent <= LIMITS.uploadsPerDay),
);

export const spendObjectReads = (count: number): Effect.Effect<boolean, StoreFailed> =>
  spentToday("objectReads", count).pipe(Effect.map((spent) => spent <= LIMITS.objectReadsPerDay));

export const forgetPastDays = Effect.gen(function* forgetPastDays() {
  const day = yield* today;
  yield* queried(() => db.delete(uploads).where(lt(uploads.day, day)));
  yield* queried(() => db.delete(objectReads).where(lt(objectReads.day, day)));
});
