import { Effect, pipe } from "effect";

import { balanceSheet } from "#/entities/ledger";
import type { BalanceSheet } from "#/entities/ledger";
import { positions } from "#/entities/ledger/index.server";
import { moneyFlow } from "#/features/report/model/money-flow";
import type { MoneyFlow } from "#/features/report/model/money-flow";
import { monthlyTotals } from "#/features/report/model/monthly";
import type { Month } from "#/features/report/model/monthly";
import type { StorageFailed } from "#/shared/db";

import { categoryTotals, dayTotals } from "./report-store.server";
import type { Period } from "./report-store.server";

export const flowReport = (period: Period): Effect.Effect<MoneyFlow, StorageFailed> =>
  pipe(categoryTotals(period), Effect.map(moneyFlow));

export const monthlyReport = ({
  from,
  to,
}: Period): Effect.Effect<readonly Month[], StorageFailed> =>
  pipe(
    dayTotals({ from, to }),
    Effect.map((totals) => monthlyTotals({ from, to, totals })),
  );

export const balanceSheetReport = (asOf: string): Effect.Effect<BalanceSheet, StorageFailed> =>
  pipe(positions(asOf), Effect.map(balanceSheet));
