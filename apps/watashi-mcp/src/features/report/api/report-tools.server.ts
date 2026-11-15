import { READ_ONLY } from "@masseater.dev/mcp-tool-call";
import { Effect, pipe } from "effect";

import { balanceSheet, BalanceSheetInput, ListTransactionsInput, Period } from "#/entities/ledger";
import { positions, lengthOf, registerAll, tool } from "#/entities/ledger/index.server";
import { moneyFlow } from "#/features/report/model/money-flow";
import { monthlyTotals } from "#/features/report/model/monthly";

import { categoryTotals, dayTotals, listTransactions } from "./report-store.server";

/** @internal */
export const REPORT_TOOLS = [
  tool({
    name: "money_transactions",
    description:
      "期間の取引を新しい順に 100 件ずつ返す。続きは next を cursor に渡して読む。口座やカテゴリーで絞れる。金額は入金が正、出金が負。",
    input: ListTransactionsInput,
    annotations: READ_ONLY,
    run: listTransactions,
    count: ({ transactions }) => transactions.length,
  }),
  tool({
    name: "money_flow",
    description:
      "期間の収入のカテゴリーから合計を経て支出のカテゴリーへ流れるサンキー図のノードとリンクを返す。内訳の名前（label）のある取引は下にノードを足す。振替は入れない。収入が多ければ差を「貯金へ」、支出が多ければ「貯金から」として足し、左右の合計をそろえる。",
    input: Period,
    annotations: READ_ONLY,
    run: (period) => pipe(categoryTotals(period), Effect.map(moneyFlow)),
    count: ({ links }) => links.length,
  }),
  tool({
    name: "money_monthly_totals",
    description: "期間の各月の収入・支出・収支を返す。取引の無い月も 0 で入れる。振替は入れない。",
    input: Period,
    annotations: READ_ONLY,
    run: ({ from, to }) =>
      pipe(
        dayTotals({ from, to }),
        Effect.map((totals) => monthlyTotals({ from, to, totals })),
      ),
    count: lengthOf,
  }),
  tool({
    name: "money_balance_sheet",
    description:
      "ある日の貸借対照表を返す。左は流動資産・固定資産・債務超過、右は流動負債・固定負債・純資産で、口座ごとの額も返す。残高の記録が無い口座は取引の合計を使う。",
    input: BalanceSheetInput,
    annotations: READ_ONLY,
    run: ({ asOf }) => pipe(positions(asOf), Effect.map(balanceSheet)),
    count: ({ accounts }) => accounts.length,
  }),
];

/** @internal */
export const registerReportTools = registerAll(REPORT_TOOLS);
