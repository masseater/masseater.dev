import { DateTime, Effect, Schema } from "effect";

import {
  BalanceSheet,
  MoneyFlow,
  MonthTotal,
  PeriodInput,
  Settings,
  TransactionPage,
  TransactionsInput,
} from "#/entities/money/model/money.ts";
import type { OverviewValue, PeriodInputValue } from "#/entities/money/model/money.ts";
import { asOfOf, periodOf, todayJst } from "#/entities/money/model/period.ts";
import type { PortalFailed, Upstreams } from "#/shared/api/index.server.ts";
import { createRouter, respond, rpcBody } from "#/shared/api/index.server.ts";

const MonthTotals = Schema.Array(MonthTotal);

const overview = (input: PeriodInputValue): Effect.Effect<OverviewValue, PortalFailed, Upstreams> =>
  Effect.gen(function* overviewOf() {
    const now = yield* DateTime.now;
    const today = todayJst(now);
    const period = periodOf({ input, today });
    const asOf = asOfOf({ period, today });
    const reports = yield* Effect.all(
      {
        flow: rpcBody({
          schema: MoneyFlow,
          call: ({ MONEY }) => MONEY.read({ view: "flow", ...period }),
        }),
        months: rpcBody({
          schema: MonthTotals,
          call: ({ MONEY }) => MONEY.read({ view: "monthly", ...period }),
        }),
        sheet: rpcBody({
          schema: BalanceSheet,
          call: ({ MONEY }) => MONEY.read({ view: "balance_sheet", asOf }),
        }),
        settings: rpcBody({
          schema: Settings,
          call: ({ MONEY }) => MONEY.read({ view: "settings" }),
        }),
      },
      { concurrency: "unbounded" },
    );
    return { period, asOf, ...reports };
  });

export const moneyRoutes = createRouter("/api/money")
  .get("/overview", ({ query, request }) => respond(request)(overview(query)), {
    query: Schema.toStandardSchemaV1(PeriodInput),
  })
  .get(
    "/transactions",
    ({ query, request }) =>
      respond(request)(
        rpcBody({
          schema: TransactionPage,
          call: ({ MONEY }) => MONEY.read({ view: "transactions", ...query }),
        }),
      ),
    { query: Schema.toStandardSchemaV1(TransactionsInput) },
  );

export type MoneyRoutes = typeof moneyRoutes;
