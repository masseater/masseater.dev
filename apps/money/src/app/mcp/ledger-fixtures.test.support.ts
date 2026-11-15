import { Array as Arr, Effect, Option, Schema, pipe } from "effect";

import { decoded, value } from "./mcp-client.test.support.ts";

type Row = typeof RowSchema.Type;

const RowSchema = Schema.Struct({
  id: Schema.Int,
  date: Schema.String,
  amount: Schema.Int,
  description: Schema.String,
  category: Schema.String,
  label: Schema.OptionFromNullOr(Schema.String),
  manual: Schema.Boolean,
});

const PageSchema = Schema.Struct({
  transactions: Schema.Array(RowSchema),
  next: Schema.OptionFromNullOr(Schema.String),
});

const ImportedSchema = Schema.Struct({
  importId: Schema.OptionFromNullOr(Schema.String),
  added: Schema.Int,
  duplicates: Schema.Int,
});

const BANK_CSV = `"普通預金 入出金明細"
"口座番号","1234567"
年月日,お引出し,お預入れ,お取り扱い内容,メモ
2026/10/25,,"300,000",ｷﾕｳﾖ ｶﾌﾞｼｷｶﾞｲｼﾔｴｲ,
2026/10/27,"85,000",,ﾔﾁﾝ,10月分
2026/10/27,"85,000",,ﾔﾁﾝ,10月分
2026/11/10,"62,000",,ﾗｸﾃﾝｶ-ﾄﾞｻ-ﾋﾞｽ,
,,,"合計",
`;

const BYTE_ORDER_MARK = "\u{FEFF}";

const CARD_CSV = `${BYTE_ORDER_MARK}利用日,利用店名・商品名,利用金額
2026/10/03,CLOUDFLARE,"1,520"
2026/10/05,ＡＮＴＨＲＯＰＩＣ,"30,000"
2026/10/09,OPENROUTER INC,"1,500"
2026/10/12,fal.ai,"2,000"
2026/10/20,スーパーマーケット,"4,200"
2026/11/02,CLOUDFLARE,"1,600"
`;

const BANK_COLUMNS = {
  date: "年月日",
  description: ["お取り扱い内容"],
  memo: "メモ",
  amount: { kind: "split", outflow: "お引出し", inflow: "お預入れ" },
};

const CARD_COLUMNS = {
  date: "利用日",
  description: ["利用店名・商品名"],
  amount: { kind: "signed", column: "利用金額", outflowPositive: true },
};

const OCTOBER_TO_NOVEMBER = { from: "2026-10", to: "2026-11" };

const BANK_HEADER_ROW = 3;

const imported = decoded(ImportedSchema);

const page = decoded(PageSchema);

const setUpAccounts = Effect.gen(function* setUpAccounts() {
  yield* value("upsert_account")({ id: "bank", name: "銀行", class: "current-asset" });
  yield* value("upsert_account")({ id: "card", name: "カード", class: "current-liability" });
});

const importBank = imported("import_csv")({
  account: "bank",
  source: "bank.csv",
  csv: BANK_CSV,
  headerRow: BANK_HEADER_ROW,
  columns: BANK_COLUMNS,
});

const importCard = imported("import_csv")({
  account: "card",
  source: "card.csv",
  csv: CARD_CSV,
  columns: CARD_COLUMNS,
});

const allRows = page("list_transactions")(OCTOBER_TO_NOVEMBER).pipe(
  Effect.map(({ transactions }) => transactions),
);

const rowOf =
  (description: string) =>
  (rows: readonly Row[]): Row =>
    pipe(
      rows,
      Arr.findFirst((row) => row.description === description),
      Option.getOrThrow,
    );

export {
  CARD_COLUMNS,
  CARD_CSV,
  OCTOBER_TO_NOVEMBER,
  allRows,
  importBank,
  importCard,
  page,
  rowOf,
  setUpAccounts,
};

export type { Row };
