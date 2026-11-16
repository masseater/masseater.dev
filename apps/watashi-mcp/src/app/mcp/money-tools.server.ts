import { OVERWRITE, READ_ONLY, one } from "@masseater.dev/mcp-tool-call";
import type { Effect } from "effect";
import { Match, Option } from "effect";

import {
  deleteRule,
  recordBalance,
  registerAll,
  setCategory,
  setRule,
  tool,
  upsertAccount,
} from "#/entities/ledger/index.server.ts";
import type { Failure, Services } from "#/entities/ledger/index.server.ts";
import { MoneyReadInput, MoneyWriteInput } from "#/entities/ledger/index.ts";
import type { MoneyRead, MoneyWrite } from "#/entities/ledger/index.ts";
import { settings } from "#/features/categorize/index.server.ts";
import {
  addTransactions,
  deleteImport,
  importCsv,
} from "#/features/import-statements/index.server.ts";
import {
  balanceSheetReport,
  flowReport,
  listTransactions,
  monthlyReport,
} from "#/features/report/index.server.ts";

type Run<Input> = (input: Input) => Effect.Effect<unknown, Failure, Services>;

const WRITE_DESCRIPTION =
  "家計簿に書く。op で操作を選ぶ。\naccount: 口座（銀行・現金・クレジットカード・投資・ローン）を作るか、名前と区分を直す。取引や残高を記録する前に作る。\nimport_csv: 銀行やカードの明細の CSV を口座に取り込む。同じ明細をもう一度取り込んでも重なった行は足さない。日付の欄が空の行（合計など）と金額が 0 の行は飛ばす。カテゴリーは規則で自動で決まり、Cloudflare・Claude・OpenRouter・fal の支払いはインフラに入る。\ntransactions: CSV の無い取引（現金など）を口座に足す。入金は正、出金は負の金額で書く。同じ内容をもう一度送っても重ねて足さない。\ndelete_import: 取り込み 1 回分の取引をまとめて消す。\nbalance: ある日の口座の残高を記録する。貸借対照表は、この残高にその日より後の取引を足して作る。\ncategory: 取引 1 件のカテゴリーを手で決める。手で決めた取引は規則が変わっても変わらない。auto で規則に戻す。\nrule: 摘要に pattern を含む取引のカテゴリーを決める規則を足すか置き換え、手で決めていない取引すべてに当て直す。後から足した規則ほど優先し、組み込みの規則より優先する。\ndelete_rule: 自分で足した規則を消し、残りの規則を当て直す。";

const READ_DESCRIPTION =
  "家計簿を読む。view で表を選ぶ。金額は円の整数で、入金が正、出金が負。\nsettings: 口座、カテゴリー、カテゴリーの規則（組み込みと自分で足したもの）を返す。\ntransactions: 期間の取引を新しい順に 100 件ずつ返す。続きは next を cursor に渡して読む。口座やカテゴリーで絞れる。\nflow: 期間の収入のカテゴリーから合計を経て支出のカテゴリーへ流れるサンキー図のノードとリンクを返す。内訳の名前（label）のある取引は下にノードを足す。振替は入れない。収入が多ければ差を「貯金へ」、支出が多ければ「貯金から」として足し、左右の合計をそろえる。\nmonthly: 期間の各月の収入・支出・収支を返す。取引の無い月も 0 で入れる。振替は入れない。\nbalance_sheet: asOf の日の貸借対照表を返す。左は流動資産・固定資産・債務超過、右は流動負債・固定負債・純資産で、口座ごとの額も返す。残高の記録が無い口座は取引の合計を使う。";

const write: Run<MoneyWrite> = Match.type<MoneyWrite>().pipe(
  Match.discriminatorsExhaustive("op")({
    account: ({ id, name, class: kind }) => upsertAccount({ id, name, class: kind }),
    import_csv: importCsv,
    transactions: addTransactions,
    delete_import: ({ importId }) => deleteImport(importId),
    balance: ({ account, date, balance }) => recordBalance({ accountId: account, date, balance }),
    category: ({ transactionId, category, label }) =>
      setCategory({ transactionId, category, label: Option.fromUndefinedOr(label) }),
    rule: ({ pattern, category, label }) =>
      setRule({ pattern, category, label: Option.fromUndefinedOr(label) }),
    delete_rule: ({ pattern }) => deleteRule(pattern),
  }),
);

const read: Run<MoneyRead> = Match.type<MoneyRead>().pipe(
  Match.discriminatorsExhaustive("view")({
    settings: () => settings,
    transactions: listTransactions,
    flow: flowReport,
    monthly: monthlyReport,
    balance_sheet: ({ asOf }) => balanceSheetReport(asOf),
  }),
);

/** @internal */
export const MONEY_READ = tool({
  name: "money_read",
  description: READ_DESCRIPTION,
  input: MoneyReadInput,
  annotations: READ_ONLY,
  run: read,
  count: one,
});

const MONEY_WRITE = tool({
  name: "money_write",
  description: WRITE_DESCRIPTION,
  input: MoneyWriteInput,
  annotations: OVERWRITE,
  run: write,
  count: one,
});

export const registerMoneyTools = registerAll([MONEY_WRITE, MONEY_READ]);
