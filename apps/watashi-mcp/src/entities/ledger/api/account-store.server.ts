import { asc, eq, lte } from "drizzle-orm";
import { Array as Arr, Effect, Number as Num, Option, Order, pipe } from "effect";

import type { AccountPosition, Snapshot } from "#/entities/ledger/model/balance-sheet";
import { InvalidRecord } from "#/shared/api";
import type { StorageFailed } from "#/shared/db";
import { db, query } from "#/shared/db/index.server";

import { summedAmount, yenOf } from "./database.server";
import type { Failure } from "./database.server";
import { accounts, balances, transactions } from "./ledger.table.ts";

export type Account = typeof accounts.$inferSelect;

export type Balance = typeof balances.$inferSelect;

const ONE_ROW = 1;

type DailyMovement = Readonly<{ accountId: string; date: string; amount: number | null }>;

export const accountNamed = (id: string): Effect.Effect<Account, Failure> =>
  query(() => db.select().from(accounts).where(eq(accounts.id, id)).limit(ONE_ROW)).pipe(
    Effect.flatMap((rows) =>
      Effect.fromOption(Arr.head(rows)).pipe(
        Effect.mapError(() =>
          InvalidRecord.make({
            message: `口座 ${id} がありません。先に money_write の op: account で作る`,
          }),
        ),
      ),
    ),
  );

export const upsertAccount = (account: Account): Effect.Effect<Account, StorageFailed> =>
  query(() =>
    db
      .insert(accounts)
      .values(account)
      .onConflictDoUpdate({
        target: accounts.id,
        set: { name: account.name, class: account.class },
      }),
  ).pipe(Effect.as(account));

export const recordBalance = Effect.fn("recordBalance")(function* recordBalance(balance: Balance) {
  yield* accountNamed(balance.accountId);
  yield* query(() =>
    db
      .insert(balances)
      .values(balance)
      .onConflictDoUpdate({
        target: [balances.accountId, balances.date],
        set: { balance: balance.balance },
      }),
  );
  return balance;
});

const latestSnapshot = (rows: readonly Balance[], accountId: string): Option.Option<Snapshot> =>
  pipe(
    rows,
    Arr.filter((row) => row.accountId === accountId),
    Arr.sortWith(({ date }: Balance) => date, Order.String),
    Arr.last,
    Option.map(({ date, balance }) => ({ date, balance })),
  );

const isAfter =
  (snapshot: Option.Option<Snapshot>) =>
  (date: string): boolean =>
    Option.match(snapshot, { onNone: () => true, onSome: (latest) => date > latest.date });

const movementOf = (
  rows: readonly DailyMovement[],
  accountId: string,
  snapshot: Option.Option<Snapshot>,
): number =>
  pipe(
    rows,
    Arr.filter((row) => row.accountId === accountId && isAfter(snapshot)(row.date)),
    Arr.map(({ amount }) => yenOf(amount)),
    Num.sumAll,
  );

export const positions = Effect.fn("positions")(function* positions(asOf: string) {
  const [accountRows, balanceRows, dailyRows] = yield* query(() =>
    db.batch([
      db.select().from(accounts).orderBy(asc(accounts.id)),
      db.select().from(balances).where(lte(balances.date, asOf)),
      db
        .select({
          accountId: transactions.accountId,
          date: transactions.date,
          amount: summedAmount,
        })
        .from(transactions)
        .where(lte(transactions.date, asOf))
        .groupBy(transactions.accountId, transactions.date),
    ]),
  );
  return pipe(
    accountRows,
    Arr.map((account): AccountPosition => {
      const snapshot = latestSnapshot(balanceRows, account.id);
      const movement = movementOf(dailyRows, account.id, snapshot);
      return { id: account.id, name: account.name, class: account.class, snapshot, movement };
    }),
  );
});

export const listAccounts = query(() => db.select().from(accounts).orderBy(asc(accounts.id)));
