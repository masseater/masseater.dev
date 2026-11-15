import { Schema } from "effect";

import { AccountClass } from "../model/accounts";
import { Category } from "../model/categories";
import { Columns } from "../model/csv";

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

const Period = Schema.Struct({
  from: Month.annotate({ description: "最初の月（YYYY-MM）" }),
  to: Month.annotate({ description: "最後の月（YYYY-MM）。from と同じか後" }),
}).check(Schema.makeFilter(({ from, to }) => from <= to || "to は from と同じか後の月にする"));

const UpsertAccountInput = Schema.Struct({
  id: AccountId,
  name: Schema.NonEmptyString.annotate({ description: "表示する名前（例: 三井住友銀行）" }),
  class: AccountClass.annotate({
    description:
      "貸借対照表での区分。銀行・現金は current-asset、投資は fixed-asset、クレジットカードは current-liability、ローンは fixed-liability",
  }),
});

const ImportCsvInput = Schema.Struct({
  account: AccountId,
  source: Schema.NonEmptyString.annotate({ description: "取り込み元の名前（ファイル名など）" }),
  csv: Schema.NonEmptyString.annotate({
    description: "CSV の本文。文字コードは読み替えた後の文字列",
  }),
  headerRow: Schema.optionalKey(
    Schema.Int.check(Schema.isGreaterThanOrEqualTo(FIRST_LINE)).annotate({
      description: "見出しのある行の番号（1 から）。省くと 1",
    }),
  ),
  columns: Columns,
});

const EntryInput = Schema.Struct({
  date: Day,
  amount: Yen.annotate({ description: "入金は正、出金は負の円の整数" }),
  description: Schema.NonEmptyString.annotate({ description: "摘要" }),
  memo: Schema.optionalKey(Schema.NonEmptyString),
});

const AddTransactionsInput = Schema.Struct({
  account: AccountId,
  source: Schema.NonEmptyString.annotate({ description: "記録の出どころ（例: 手入力、現金）" }),
  transactions: Schema.NonEmptyArray(EntryInput),
});

const ImportId = Schema.NonEmptyString.annotate({ description: "取り込みが返した importId" });

const DeleteImportInput = Schema.Struct({ importId: ImportId });

const RecordBalanceInput = Schema.Struct({
  account: AccountId,
  date: Day.annotate({ description: "残高を確かめた日（その日の終わりの残高）" }),
  balance: Yen.annotate({
    description: "その日の残高。負債の口座では借りている額を正の数で書く",
  }),
});

const SetCategoryInput = Schema.Struct({
  transactionId: Schema.Int.check(Schema.isGreaterThanOrEqualTo(FIRST_ID)),
  category: Schema.Union([Category, Schema.Literal("auto")]).annotate({
    description: "手で決めるカテゴリー。auto なら手で決めたのをやめ、規則に戻す",
  }),
  label: Schema.optionalKey(Label),
});

const SetRuleInput = Schema.Struct({
  pattern: Schema.NonEmptyString.annotate({
    description:
      "摘要に含まれていれば当てはまる文字列。全角・半角と大文字・小文字は区別しない。同じ pattern の規則は置き換える",
  }),
  category: Category,
  label: Schema.optionalKey(Label),
});

const DeleteRuleInput = Schema.Struct({ pattern: Schema.NonEmptyString });

const ListTransactionsInput = Schema.Struct({
  ...Period.fields,
  account: Schema.optionalKey(AccountId),
  category: Schema.optionalKey(Category),
  cursor: Schema.optionalKey(
    Schema.NonEmptyString.annotate({ description: "前のページが返した next" }),
  ),
}).check(Schema.makeFilter(({ from, to }) => from <= to || "to は from と同じか後の月にする"));

const BalanceSheetInput = Schema.Struct({
  asOf: Day.annotate({ description: "この日の終わりの残高で表を作る" }),
});

const EmptyInput = Schema.Struct({});

export {
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
};
