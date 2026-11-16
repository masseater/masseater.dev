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
import { settings } from "#/features/configure-categories/index.server.ts";
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
} from "#/features/report-money/index.server.ts";

type Run<Input> = (input: Input) => Effect.Effect<unknown, Failure, Services>;

const WRITE_DESCRIPTION = "Write to the owner's household ledger.";

const READ_DESCRIPTION = "Read reports from the owner's household ledger.";

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
