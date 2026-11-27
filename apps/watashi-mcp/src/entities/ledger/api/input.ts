import type { StandardSchemaWithJSON } from "@modelcontextprotocol/server";
import { Schema, pipe } from "effect";

import { AccountClassSchema } from "#/entities/ledger/model/accounts.ts";
import { CategorySchema } from "#/entities/ledger/model/categories.ts";
import { ColumnsSchema } from "#/entities/ledger/model/csv-columns.ts";

type InputSchema = Schema.ConstraintDecoder<unknown> & Schema.Constraint;

const MONTH = /^\d{4}-(?:0[1-9]|1[0-2])$/u;

const DAY = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/u;

const ACCOUNT_ID = /^[a-z0-9][a-z0-9-]*$/u;

const FIRST_LINE = 1;

const FIRST_ID = 1;

const AccountId = Schema.String.check(Schema.isPattern(ACCOUNT_ID)).annotate({
  description: "Such as smbc or rakuten-card",
});

const Month = Schema.String.check(Schema.isPattern(MONTH)).annotate({
  description: "YYYY-MM",
});

const Day = Schema.String.check(Schema.isPattern(DAY)).annotate({ description: "YYYY-MM-DD" });

const Yen = Schema.Int;

const Label = Schema.NonEmptyString.annotate({
  description: "Breakdown under the category, such as Cloudflare",
});

const LineNumber = Schema.Int.check(Schema.isGreaterThanOrEqualTo(FIRST_LINE));

const TransactionId = Schema.Int.check(Schema.isGreaterThanOrEqualTo(FIRST_ID));

const ordered = Schema.makeFilter(
  ({ from, to }: Readonly<{ from: string; to: string }>) =>
    from <= to || "to must be the same month as from or later",
);

const PERIOD_FIELDS = {
  from: Month,
  to: Month,
};

const UpsertAccountInputSchema = Schema.Struct({
  id: AccountId,
  name: Schema.NonEmptyString,
  class: AccountClassSchema.annotate({
    description:
      "bank and cash: current-asset, investments: fixed-asset, credit cards: current-liability, loans: fixed-liability",
  }),
});

const ImportCsvInputSchema = Schema.Struct({
  account: AccountId,
  source: Schema.NonEmptyString.annotate({ description: "Such as the file name" }),
  csv: Schema.NonEmptyString,
  headerRow: Schema.optionalKey(
    LineNumber.annotate({ description: "1-based line of the column headings. Default 1" }),
  ),
  columns: ColumnsSchema,
});

const EntryInput = Schema.Struct({
  date: Day,
  amount: Yen.annotate({ description: "Yen. Inflow positive, outflow negative" }),
  description: Schema.NonEmptyString,
  memo: Schema.optionalKey(Schema.NonEmptyString),
});

const AddTransactionsInputSchema = Schema.Struct({
  account: AccountId,
  source: Schema.NonEmptyString.annotate({ description: "Such as manual or cash" }),
  transactions: Schema.NonEmptyArray(EntryInput),
});

const ImportId = Schema.NonEmptyString.annotate({ description: "From import_csv" });

const DeleteImportInputSchema = Schema.Struct({ importId: ImportId });

const RecordBalanceInputSchema = Schema.Struct({
  account: AccountId,
  date: Day.annotate({ description: "The balance is as of the end of this day" }),
  balance: Yen.annotate({ description: "Liability accounts: the amount owed, positive" }),
});

const SetCategoryInputSchema = Schema.Struct({
  transactionId: TransactionId,
  category: Schema.Union([CategorySchema, Schema.Literal("auto")]).annotate({
    description: "auto returns the transaction to the rules",
  }),
  label: Schema.optionalKey(Label),
});

const SetRuleInputSchema = Schema.Struct({
  pattern: Schema.NonEmptyString.annotate({
    description: "Text in the description to match, ignoring width and case",
  }),
  category: CategorySchema,
  label: Schema.optionalKey(Label),
});

const DeleteRuleInputSchema = Schema.Struct({ pattern: Schema.NonEmptyString });

const ListTransactionsFields = {
  ...PERIOD_FIELDS,
  account: Schema.optionalKey(AccountId),
  category: Schema.optionalKey(CategorySchema),
  cursor: Schema.optionalKey(
    Schema.NonEmptyString.annotate({ description: "next from the previous page" }),
  ),
};

const BalanceSheetInputSchema = Schema.Struct({
  asOf: Day,
});

const literal = <Name extends string>(name: Name, description: string): Schema.Literal<Name> =>
  Schema.Literal(name).annotate({ description });

const MoneyWriteInputSchema = Schema.Union([
  Schema.Struct({
    op: literal("account", "Create or edit an account. Do this before recording to it"),
    ...UpsertAccountInputSchema.fields,
  }),
  Schema.Struct({
    op: literal("import_csv", "Import a statement CSV. Rows already imported are skipped"),
    ...ImportCsvInputSchema.fields,
  }),
  Schema.Struct({
    op: literal("transactions", "Add entries that have no CSV, such as cash"),
    ...AddTransactionsInputSchema.fields,
  }),
  Schema.Struct({
    op: literal("delete_import", "Delete every transaction of one import"),
    ...DeleteImportInputSchema.fields,
  }),
  Schema.Struct({
    op: literal("balance", "Record an account balance on a day"),
    ...RecordBalanceInputSchema.fields,
  }),
  Schema.Struct({
    op: literal("category", "Set one transaction's category by hand; rules no longer change it"),
    ...SetCategoryInputSchema.fields,
  }),
  Schema.Struct({
    op: literal("rule", "Add or replace a category rule and reapply rules. Later rules win"),
    ...SetRuleInputSchema.fields,
  }),
  Schema.Struct({
    op: literal("delete_rule", "Delete a rule you added and reapply rules"),
    ...DeleteRuleInputSchema.fields,
  }),
]);

const MoneyReadInputSchema = Schema.Union([
  Schema.Struct({ view: literal("settings", "Accounts, categories and category rules") }),
  Schema.Struct({
    view: literal("transactions", "Transactions, newest first, 100 per page"),
    ...ListTransactionsFields,
  }).check(ordered),
  Schema.Struct({
    view: literal("flow", "Sankey nodes and links from income to spending, without transfers"),
    ...PERIOD_FIELDS,
  }).check(ordered),
  Schema.Struct({
    view: literal("monthly", "Income, spending and net per month, without transfers"),
    ...PERIOD_FIELDS,
  }).check(ordered),
  Schema.Struct({
    view: literal("balance_sheet", "Balance sheet at the end of asOf, per account"),
    ...BalanceSheetInputSchema.fields,
  }),
]);

const standard = <Target extends InputSchema>(
  schema: Target,
): StandardSchemaWithJSON<Target["Encoded"], Target["Type"]> & Target =>
  pipe(schema, Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

export const MoneyWriteInput = standard(MoneyWriteInputSchema);

export const MoneyReadInput = standard(MoneyReadInputSchema);

export type MoneyWrite = typeof MoneyWriteInputSchema.Type;

export type MoneyRead = typeof MoneyReadInputSchema.Type;

export type MoneyWriteOf<Op extends MoneyWrite["op"]> = Extract<MoneyWrite, Readonly<{ op: Op }>>;
