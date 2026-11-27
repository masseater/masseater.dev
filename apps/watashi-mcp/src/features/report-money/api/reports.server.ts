import { Effect, pipe } from "effect";

import { positions } from "#/entities/ledger/index.server.ts";
import { balanceSheet } from "#/entities/ledger/index.ts";
import type { BalanceSheet } from "#/entities/ledger/index.ts";
import { moneyFlow } from "#/features/report-money/model/money-flow.ts";
import type { MoneyFlow } from "#/features/report-money/model/money-flow.ts";
import { monthlyTotals } from "#/features/report-money/model/monthly.ts";
import type { Month } from "#/features/report-money/model/monthly.ts";
import type { Database } from "#/shared/db/index.server.ts";
import type { StorageFailed } from "#/shared/db/index.ts";

import { categoryTotals, dayTotals } from "./report-store.server.ts";
import type { Period } from "./report-store.server.ts";

export const flowReport = (period: Period): Effect.Effect<MoneyFlow, StorageFailed, Database> =>
  pipe(categoryTotals(period), Effect.map(moneyFlow));

export const monthlyReport = ({
  from,
  to,
}: Period): Effect.Effect<readonly Month[], StorageFailed, Database> =>
  pipe(
    dayTotals({ from, to }),
    Effect.map((totals) => monthlyTotals({ from, to, totals })),
  );

export const balanceSheetReport = (
  asOf: string,
): Effect.Effect<BalanceSheet, StorageFailed, Database> =>
  pipe(positions(asOf), Effect.map(balanceSheet));
