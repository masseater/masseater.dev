import type { StandardSchemaWithJSON } from "@modelcontextprotocol/server";
import { Schema, pipe } from "effect";

import { AccountClassSchema } from "#/entities/ledger/model/accounts";
import { CategorySchema } from "#/entities/ledger/model/categories";
import { ColumnsSchema } from "#/entities/ledger/model/csv-columns";

type InputSchema = Schema.ConstraintDecoder<unknown> & Schema.Constraint;

const MONTH = /^\d{4}-(?:0[1-9]|1[0-2])$/u;

const DAY = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/u;

const ACCOUNT_ID = /^[a-z0-9][a-z0-9-]*$/u;

const FIRST_LINE = 1;

const FIRST_ID = 1;

const AccountId = Schema.String.check(Schema.isPattern(ACCOUNT_ID)).annotate({
  description: "口座の id。英小文字・数字・ハイフン（例: smbc、rakuten-card）",
});

const Month = Schema.String.check(Schema.isPattern(MONTH)).annotate({
  description: "YYYY-MM",
});

const Day = Schema.String.check(Schema.isPattern(DAY)).annotate({ description: "YYYY-MM-DD" });

const Yen = Schema.Int.annotate({ description: "円の整数" });

const Label = Schema.NonEmptyString.annotate({
  description: "カテゴリーの下に並べる内訳の名前（例: Cloudflare）",
});

const LineNumber = Schema.Int.check(Schema.isGreaterThanOrEqualTo(FIRST_LINE));

const TransactionId = Schema.Int.check(Schema.isGreaterThanOrEqualTo(FIRST_ID));

const ordered = Schema.makeFilter(
  ({ from, to }: Readonly<{ from: string; to: string }>) =>
    from <= to || "to は from と同じか後の月にする",
);

const PERIOD_FIELDS = {
  from: Month.annotate({ description: "最初の月（YYYY-MM）" }),
  to: Month.annotate({ description: "最後の月（YYYY-MM）。from と同じか後" }),
};

const UpsertAccountInputSchema = Schema.Struct({
  id: AccountId,
  name: Schema.NonEmptyString.annotate({ description: "表示する名前（例: 三井住友銀行）" }),
  class: AccountClassSchema.annotate({
    description:
      "貸借対照表での区分。銀行・現金は current-asset、投資は fixed-asset、クレジットカードは current-liability、ローンは fixed-liability",
  }),
});

const ImportCsvInputSchema = Schema.Struct({
  account: AccountId,
  source: Schema.NonEmptyString.annotate({ description: "取り込み元の名前（ファイル名など）" }),
  csv: Schema.NonEmptyString.annotate({
    description: "CSV の本文。文字コードは読み替えた後の文字列",
  }),
  headerRow: Schema.optionalKey(
    LineNumber.annotate({ description: "見出しのある行の番号（1 から）。省くと 1" }),
  ),
  columns: ColumnsSchema,
});

const EntryInput = Schema.Struct({
  date: Day,
  amount: Yen.annotate({ description: "入金は正、出金は負の円の整数" }),
  description: Schema.NonEmptyString.annotate({ description: "摘要" }),
  memo: Schema.optionalKey(Schema.NonEmptyString),
});

const AddTransactionsInputSchema = Schema.Struct({
  account: AccountId,
  source: Schema.NonEmptyString.annotate({ description: "記録の出どころ（例: 手入力、現金）" }),
  transactions: Schema.NonEmptyArray(EntryInput),
});

const ImportId = Schema.NonEmptyString.annotate({ description: "取り込みが返した importId" });

const DeleteImportInputSchema = Schema.Struct({ importId: ImportId });

const RecordBalanceInputSchema = Schema.Struct({
  account: AccountId,
  date: Day.annotate({ description: "残高を確かめた日（その日の終わりの残高）" }),
  balance: Yen.annotate({
    description: "その日の残高。負債の口座では借りている額を正の数で書く",
  }),
});

const SetCategoryInputSchema = Schema.Struct({
  transactionId: TransactionId,
  category: Schema.Union([CategorySchema, Schema.Literal("auto")]).annotate({
    description: "手で決めるカテゴリー。auto なら手で決めたのをやめ、規則に戻す",
  }),
  label: Schema.optionalKey(Label),
});

const SetRuleInputSchema = Schema.Struct({
  pattern: Schema.NonEmptyString.annotate({
    description:
      "摘要に含まれていれば当てはまる文字列。全角・半角と大文字・小文字は区別しない。同じ pattern の規則は置き換える",
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
    Schema.NonEmptyString.annotate({ description: "前のページが返した next" }),
  ),
};

const BalanceSheetInputSchema = Schema.Struct({
  asOf: Day.annotate({ description: "この日の終わりの残高で表を作る" }),
});

const op = <Name extends string>(name: Name): Schema.Literal<Name> =>
  Schema.Literal(name).annotate({ description: "する操作" });

const view = <Name extends string>(name: Name): Schema.Literal<Name> =>
  Schema.Literal(name).annotate({ description: "読む表" });

const MoneyWriteInputSchema = Schema.Union([
  Schema.Struct({ op: op("account"), ...UpsertAccountInputSchema.fields }),
  Schema.Struct({ op: op("import_csv"), ...ImportCsvInputSchema.fields }),
  Schema.Struct({ op: op("transactions"), ...AddTransactionsInputSchema.fields }),
  Schema.Struct({ op: op("delete_import"), ...DeleteImportInputSchema.fields }),
  Schema.Struct({ op: op("balance"), ...RecordBalanceInputSchema.fields }),
  Schema.Struct({ op: op("category"), ...SetCategoryInputSchema.fields }),
  Schema.Struct({ op: op("rule"), ...SetRuleInputSchema.fields }),
  Schema.Struct({ op: op("delete_rule"), ...DeleteRuleInputSchema.fields }),
]);

const MoneyReadInputSchema = Schema.Union([
  Schema.Struct({ view: view("settings") }),
  Schema.Struct({ view: view("transactions"), ...ListTransactionsFields }).check(ordered),
  Schema.Struct({ view: view("flow"), ...PERIOD_FIELDS }).check(ordered),
  Schema.Struct({ view: view("monthly"), ...PERIOD_FIELDS }).check(ordered),
  Schema.Struct({ view: view("balance_sheet"), ...BalanceSheetInputSchema.fields }),
]);

type Standard<Target extends InputSchema> = StandardSchemaWithJSON<
  Target["Encoded"],
  Target["Type"]
> &
  Target;

const standard = <Target extends InputSchema>(schema: Target): Standard<Target> =>
  pipe(schema, Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

export const MoneyWriteInput = standard(MoneyWriteInputSchema);

export const MoneyReadInput = standard(MoneyReadInputSchema);

export type MoneyWrite = typeof MoneyWriteInputSchema.Type;

export type MoneyRead = typeof MoneyReadInputSchema.Type;

export type MoneyWriteOf<Op extends MoneyWrite["op"]> = Extract<MoneyWrite, Readonly<{ op: Op }>>;
