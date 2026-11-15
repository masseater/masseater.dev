import type { Caller } from "@masseater.dev/mcp-tool-call";
import { NO_PROJECT, OVERWRITE, READ_ONLY, WRITE, one } from "@masseater.dev/mcp-tool-call";
import { McpServer } from "@modelcontextprotocol/server";
import { Array as Arr, Effect, Result, Schema, pipe } from "effect";

import { SERVER_NAME } from "#/shared/config";

import { parseCsv } from "../model/csv";
import { balanceSheet, monthlyTotals, moneyFlow } from "../model/reports";
import {
  AddTransactionsInput,
  BalanceSheetInput,
  DeleteImportInput,
  DeleteRuleInput,
  EmptyInput,
  ImportCsvInput,
  ListTransactionsInput,
  Period,
  RecordBalanceInput,
  SetCategoryInput,
  SetRuleInput,
  UpsertAccountInput,
} from "./input";
import {
  categoryTotals,
  deleteImport,
  deleteRule,
  importEntries,
  listTransactions,
  monthTotals,
  positions,
  recordBalance,
  setCategory,
  setRule,
  settings,
  upsertAccount,
} from "./ledger";
import type { Failure } from "./ledger";
import { rejected } from "./rejected";
import { meteredInput, runTool } from "./tool-call";
import type { ToolName } from "./tool-call";

type Annotations = typeof READ_ONLY | typeof WRITE | typeof OVERWRITE;

type InputSchema = Schema.ConstraintDecoder<unknown> & Schema.Constraint;

type Tool<Input extends InputSchema, Value> = Readonly<{
  name: ToolName;
  description: string;
  input: Input;
  annotations: Annotations;
  run: (input: Input["Type"]) => Effect.Effect<Value, Failure>;
  count: (value: Value) => number;
}>;

type Register = (server: McpServer) => McpServer;

const SERVER_INFO = { name: SERVER_NAME, version: "0.0.0" };

const DEFAULT_HEADER_ROW = 1;

const tool =
  <Input extends InputSchema, Value>(spec: Tool<Input, Value>) =>
  (caller: Caller): Register =>
  (server) => {
    const meter = { tool: spec.name, caller, project: NO_PROJECT } as const;
    server.registerTool(
      spec.name,
      {
        description: spec.description,
        inputSchema: meteredInput(meter)(
          Schema.toStandardJSONSchemaV1(Schema.toStandardSchemaV1(spec.input)),
        ),
        annotations: spec.annotations,
      },
      (input) => spec.run(input).pipe(runTool({ ...meter, input, count: spec.count })),
    );
    return server;
  };

const lengthOf = (values: readonly unknown[]): number => values.length;

const TOOLS = [
  tool({
    name: "upsert_account",
    description:
      "口座（銀行・現金・クレジットカード・投資・ローン）を作るか、名前と区分を直す。取引や残高を記録する前に作る。",
    input: UpsertAccountInput,
    annotations: WRITE,
    run: upsertAccount,
    count: one,
  }),
  tool({
    name: "import_csv",
    description:
      "銀行やカードの明細の CSV を口座に取り込む。同じ明細をもう一度取り込んでも重なった行は足さない。カテゴリーは規則（get_settings の rules）で自動で決まり、Cloudflare・Claude・OpenRouter・fal の支払いはインフラに入る。日付の欄が空の行（合計など）と金額が 0 の行は飛ばす。",
    input: ImportCsvInput,
    annotations: WRITE,
    run: ({ account, source, csv, headerRow, columns }) =>
      pipe(
        parseCsv(csv, { headerRow: headerRow ?? DEFAULT_HEADER_ROW, columns }),
        Result.match({
          onFailure: (message) => Effect.fail(rejected(message)),
          onSuccess: ({ rows, skipped }) =>
            importEntries(account, source, rows).pipe(
              Effect.map((imported) => ({ ...imported, rows: rows.length, skippedLines: skipped })),
            ),
        }),
      ),
    count: ({ added }) => added,
  }),
  tool({
    name: "add_transactions",
    description:
      "CSV の無い取引（現金など）を口座に足す。入金は正、出金は負の金額で書く。同じ内容をもう一度送っても重ねて足さない。",
    input: AddTransactionsInput,
    annotations: WRITE,
    run: ({ account, source, transactions }) =>
      importEntries(
        account,
        source,
        Arr.map(transactions, (entry) => ({ ...entry, memo: entry.memo ?? null })),
      ),
    count: ({ added }) => added,
  }),
  tool({
    name: "delete_import",
    description: "取り込み 1 回分の取引をまとめて消す。取り込みを間違えたときに使う。",
    input: DeleteImportInput,
    annotations: OVERWRITE,
    run: ({ importId }) => deleteImport(importId),
    count: ({ deleted }) => deleted,
  }),
  tool({
    name: "record_balance",
    description:
      "ある日の口座の残高を記録する。貸借対照表は、この残高に、その日より後の取引を足して作る。",
    input: RecordBalanceInput,
    annotations: WRITE,
    run: ({ account, date, balance }) => recordBalance(account, date, balance),
    count: one,
  }),
  tool({
    name: "set_category",
    description:
      "取引 1 件のカテゴリーを手で決める。手で決めた取引は規則が変わっても変わらない。auto で規則に戻す。",
    input: SetCategoryInput,
    annotations: WRITE,
    run: setCategory,
    count: one,
  }),
  tool({
    name: "set_category_rule",
    description:
      "摘要に pattern を含む取引のカテゴリーを決める規則を足すか置き換え、手で決めていない取引すべてに当て直す。後から足した規則ほど優先し、組み込みの規則より優先する。",
    input: SetRuleInput,
    annotations: WRITE,
    run: ({ pattern, category, label }) => setRule({ pattern, category, label: label ?? null }),
    count: one,
  }),
  tool({
    name: "delete_category_rule",
    description: "自分で足した規則を消し、手で決めていない取引すべてに残りの規則を当て直す。",
    input: DeleteRuleInput,
    annotations: OVERWRITE,
    run: ({ pattern }) => deleteRule(pattern),
    count: one,
  }),
  tool({
    name: "get_settings",
    description: "口座、カテゴリー、カテゴリーの規則（組み込みと自分で足したもの）を返す。",
    input: EmptyInput,
    annotations: READ_ONLY,
    run: () => settings,
    count: ({ accounts }) => accounts.length,
  }),
  tool({
    name: "list_transactions",
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
    run: (period) => categoryTotals(period).pipe(Effect.map(moneyFlow)),
    count: ({ links }) => links.length,
  }),
  tool({
    name: "monthly_totals",
    description: "期間の各月の収入・支出・収支を返す。取引の無い月も 0 で入れる。振替は入れない。",
    input: Period,
    annotations: READ_ONLY,
    run: (period) =>
      monthTotals(period).pipe(
        Effect.map((totals) => monthlyTotals(period.from, period.to, totals)),
      ),
    count: lengthOf,
  }),
  tool({
    name: "balance_sheet",
    description:
      "ある日の貸借対照表を返す。左は流動資産・固定資産・債務超過、右は流動負債・固定負債・純資産で、口座ごとの額も返す。残高の記録が無い口座は取引の合計を使う。",
    input: BalanceSheetInput,
    annotations: READ_ONLY,
    run: ({ asOf }) => positions(asOf).pipe(Effect.map(balanceSheet)),
    count: ({ accounts }) => accounts.length,
  }),
] as const;

const registerTools = (caller: Caller): McpServer =>
  Arr.reduce(TOOLS, new McpServer(SERVER_INFO), (server, register) => register(caller)(server));

export { registerTools };
