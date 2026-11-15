import { DateTime, Effect, Schema } from "effect";

import {
  BalanceSheet,
  MoneyFlow,
  MonthTotal,
  PeriodInput,
  Settings,
  TransactionPage,
  TransactionsInput,
} from "#/entities/money/model/money";
import type { OverviewValue, PeriodInputValue } from "#/entities/money/model/money";
import { asOfOf, periodOf, todayJst } from "#/entities/money/model/period";
import type { PortalFailed } from "#/shared/api/index.server";
import { createRouter, money, respond, rpcBody } from "#/shared/api/index.server";

const MonthTotals = Schema.Array(MonthTotal);

const overview = (input: PeriodInputValue): Effect.Effect<OverviewValue, PortalFailed> =>
  Effect.gen(function* overviewOf() {
    const now = yield* DateTime.now;
    const today = todayJst(now);
    const period = periodOf({ input, today });
    const asOf = asOfOf({ period, today });
    const reports = yield* Effect.all(
      {
        flow: rpcBody({ schema: MoneyFlow, call: () => money().read({ view: "flow", ...period }) }),
        months: rpcBody({
          schema: MonthTotals,
          call: () => money().read({ view: "monthly", ...period }),
        }),
        sheet: rpcBody({
          schema: BalanceSheet,
          call: () => money().read({ view: "balance_sheet", asOf }),
        }),
        settings: rpcBody({
          schema: Settings,
          call: () => money().read({ view: "settings" }),
        }),
      },
      { concurrency: "unbounded" },
    );
    return { period, asOf, ...reports };
  });

export const moneyRoutes = createRouter("/api/money")
  .get("/overview", ({ query }) => respond(overview(query)), {
    query: Schema.toStandardSchemaV1(PeriodInput),
  })
  .get(
    "/transactions",
    ({ query }) =>
      respond(
        rpcBody({
          schema: TransactionPage,
          call: () => money().read({ view: "transactions", ...query }),
        }),
      ),
    { query: Schema.toStandardSchemaV1(TransactionsInput) },
  );

export type MoneyRoutes = typeof moneyRoutes;
