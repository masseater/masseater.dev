import { and, desc, eq, gte, lt, lte, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";

import { summedAmount, yenOf } from "#/entities/ledger/index.server.ts";
import type { Category } from "#/entities/ledger/index.ts";
import { transactions } from "#/entities/ledger/index.ts";
import type { CategoryTotal } from "#/features/report/model/money-flow.ts";
import type { DayTotal } from "#/features/report/model/monthly.ts";
import { db, query } from "#/shared/db/index.server.ts";
import type { StorageFailed } from "#/shared/db/index.ts";

export type Period = Readonly<{ from: string; to: string }>;

export type TransactionFilter = Period &
  Readonly<{ account?: string; category?: Category; cursor?: string }>;

export type Transaction = Omit<typeof transactions.$inferSelect, "normalized" | "hash">;

export type TransactionPage = Readonly<{
  transactions: readonly Transaction[];
  next: string | null;
}>;

const PAGE_SIZE = 100;

const PEEK = 1;

const CURSOR_SEPARATOR = "|";

const DECIMAL = 10;

const inPeriod = ({ from, to }: Period): SQL | undefined =>
  and(gte(transactions.date, `${from}-01`), lte(transactions.date, `${to}-31`));

const afterCursor = (cursor: string): SQL | undefined => {
  const [date, id = ""] = Str.split(CURSOR_SEPARATOR)(cursor);
  const before = Number.parseInt(id, DECIMAL);
  return or(
    lt(transactions.date, date),
    and(eq(transactions.date, date), lt(transactions.id, before)),
  );
};

const cursorOf = ({ date, id }: Transaction): string =>
  Arr.join([date, String(id)], CURSOR_SEPARATOR);

const filtersOf = (filter: TransactionFilter): readonly (SQL | undefined)[] =>
  Arr.getSomes([
    Option.map(Option.fromUndefinedOr(filter.account), (account) =>
      eq(transactions.accountId, account),
    ),
    Option.map(Option.fromUndefinedOr(filter.category), (category) =>
      eq(transactions.category, category),
    ),
    Option.map(Option.fromUndefinedOr(filter.cursor), afterCursor),
  ]);

const pageOf = (rows: readonly Transaction[]): TransactionPage => {
  const page = Arr.take(rows, PAGE_SIZE);
  return {
    transactions: page,
    next: pipe(
      Arr.last(page),
      Option.filter(() => rows.length > PAGE_SIZE),
      Option.map(cursorOf),
      Option.getOrNull,
    ),
  };
};

export const listTransactions = (
  filter: TransactionFilter,
): Effect.Effect<TransactionPage, StorageFailed> =>
  query(() =>
    db
      .select({
        id: transactions.id,
        accountId: transactions.accountId,
        importId: transactions.importId,
        date: transactions.date,
        amount: transactions.amount,
        description: transactions.description,
        memo: transactions.memo,
        category: transactions.category,
        label: transactions.label,
        manual: transactions.manual,
      })
      .from(transactions)
      .where(and(inPeriod(filter), ...filtersOf(filter)))
      .orderBy(desc(transactions.date), desc(transactions.id))
      .limit(PAGE_SIZE + PEEK),
  ).pipe(Effect.map(pageOf));

export const categoryTotals = (
  period: Period,
): Effect.Effect<readonly CategoryTotal[], StorageFailed> =>
  query(() =>
    db
      .select({ category: transactions.category, label: transactions.label, amount: summedAmount })
      .from(transactions)
      .where(inPeriod(period))
      .groupBy(transactions.category, transactions.label),
  ).pipe(
    Effect.map(
      Arr.map(({ category, label, amount }) => ({
        category,
        label: Option.fromNullOr(label),
        amount: yenOf(amount),
      })),
    ),
  );

export const dayTotals = (period: Period): Effect.Effect<readonly DayTotal[], StorageFailed> =>
  query(() =>
    db
      .select({ date: transactions.date, category: transactions.category, amount: summedAmount })
      .from(transactions)
      .where(inPeriod(period))
      .groupBy(transactions.date, transactions.category),
  ).pipe(
    Effect.map(
      Arr.map(({ date, category, amount }) => ({ date, category, amount: yenOf(amount) })),
    ),
  );
