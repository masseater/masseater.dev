import { OVERWRITE, WRITE, one } from "@masseater.dev/mcp-tool-call";
import { Array as Arr, Effect, Option, pipe } from "effect";

import {
  recordBalance,
  upsertAccount,
  AddTransactionsInput,
  DeleteImportInput,
  ImportCsvInput,
  RecordBalanceInput,
  UpsertAccountInput,
  registerAll,
  tool,
} from "#/entities/ledger";
import { parseCsv } from "#/features/import-statements/model/csv";
import { rejected } from "#/shared/api";

import { deleteImport, importEntries } from "./import-store";

type CsvImport = typeof ImportCsvInput.Type;

type Entries = typeof AddTransactionsInput.Type;

const DEFAULT_HEADER_ROW = 1;

const importCsv = Effect.fn("importCsv")(function* importCsv(input: CsvImport) {
  const headerRow = pipe(
    Option.fromUndefinedOr(input.headerRow),
    Option.getOrElse(() => DEFAULT_HEADER_ROW),
  );
  const parsed = yield* pipe(
    parseCsv({ csv: input.csv, headerRow, columns: input.columns }),
    Effect.fromResult,
    Effect.mapError(rejected),
  );
  const imported = yield* importEntries({
    accountId: input.account,
    source: input.source,
    entries: parsed.rows,
  });
  return {
    importId: imported.importId,
    added: imported.added,
    duplicates: imported.duplicates,
    rows: parsed.rows.length,
    skippedLines: parsed.skipped,
  };
});

const addTransactions = Effect.fn("addTransactions")(function* addTransactions({
  account,
  source,
  transactions,
}: Entries) {
  const entries = pipe(
    transactions,
    Arr.map(({ date, amount, description, memo }) => ({
      date,
      amount,
      description,
      memo: Option.fromUndefinedOr(memo),
    })),
  );
  return yield* importEntries({ accountId: account, source, entries });
});

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
    run: importCsv,
    count: ({ added }) => added,
  }),
  tool({
    name: "add_transactions",
    description:
      "CSV の無い取引（現金など）を口座に足す。入金は正、出金は負の金額で書く。同じ内容をもう一度送っても重ねて足さない。",
    input: AddTransactionsInput,
    annotations: WRITE,
    run: addTransactions,
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
    run: ({ account, date, balance }) => recordBalance({ accountId: account, date, balance }),
    count: one,
  }),
];

const registerLedgerTools = registerAll(TOOLS);

export { registerLedgerTools };
