import { expect, it } from "@effect/vitest";
import type { Caller } from "@masseater.dev/mcp-tool-call";
import { createMcpHandler } from "@modelcontextprotocol/server";
import {
  Array as Arr,
  Boolean as Bool,
  Effect,
  Option,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";
import { afterAll, beforeEach, vi } from "vite-plus/test";

import { registerTools } from "./tools";
import { closeDatabase, resetDatabase } from "./tools.test.support.ts";

vi.mock("cloudflare:workers", () => import("./tools.test.support.ts"));

beforeEach(() => Effect.runPromise(resetDatabase));
afterAll(() => Effect.runPromise(closeDatabase));

type Args = Readonly<Record<string, unknown>>;

type Called = Readonly<{ isError: boolean; text: string }>;

const OWNER: Caller = { client: "claude-code", userAgent: "vitest" };

const DATA_LINE = /^data: (?<json>.+)$/mu;

const CallResult = Schema.Struct({
  content: Schema.Array(Schema.Struct({ type: Schema.String, text: Schema.String })),
  isError: Schema.optionalKey(Schema.Boolean),
});

const decodeResult = Schema.decodeEffect(
  Schema.fromJsonString(Schema.Struct({ result: CallResult })),
);

const decodeJson = Schema.decodeEffect(Schema.fromJsonString(Schema.Unknown));

const encodeJson = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

const mcpRequest = (body: string): Request =>
  new Request("https://money.masseater.dev/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body,
  });

const payloadOf = (text: string): string =>
  pipe(
    text,
    Str.match(DATA_LINE),
    Option.flatMap(({ groups }) => Option.fromNullishOr(groups)),
    Option.flatMap(Rec.get("json")),
    Option.getOrElse(() => text),
  );

const call = (name: string, args: Args): Effect.Effect<Called> =>
  Effect.gen(function* called() {
    const body = yield* encodeJson({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name, arguments: args },
    });
    const response = yield* Effect.promise(() =>
      createMcpHandler(() => registerTools(OWNER)).fetch(mcpRequest(body)),
    );
    const text = yield* Effect.promise(() => response.text());
    const { result } = yield* decodeResult(payloadOf(text));
    const joined = pipe(
      result.content,
      Arr.map((item) => item.text),
      Arr.join("\n"),
    );
    return { isError: result.isError ?? false, text: joined };
  }).pipe(Effect.orDie);

const value = (name: string, args: Args): Effect.Effect<unknown> =>
  call(name, args).pipe(
    Effect.flatMap(({ isError, text }) =>
      Bool.match(isError, {
        onTrue: () => Effect.die(text),
        onFalse: () => decodeJson(text).pipe(Effect.orDie),
      }),
    ),
  );

const decoded =
  <S extends Schema.ConstraintDecoder<unknown> & Schema.Constraint>(schema: S) =>
  (name: string, args: Args): Effect.Effect<S["Type"]> =>
    value(name, args).pipe(
      Effect.flatMap((result) => Schema.decodeUnknownEffect(schema)(result)),
      Effect.orDie,
    );

const Imported = Schema.Struct({
  importId: Schema.NullOr(Schema.String),
  added: Schema.Int,
  duplicates: Schema.Int,
});

const Row = Schema.Struct({
  id: Schema.Int,
  date: Schema.String,
  amount: Schema.Int,
  description: Schema.String,
  category: Schema.String,
  label: Schema.NullOr(Schema.String),
  manual: Schema.Boolean,
});

const Page = Schema.Struct({ transactions: Schema.Array(Row), next: Schema.NullOr(Schema.String) });

const Flow = Schema.Struct({
  nodes: Schema.Array(Schema.Struct({ id: Schema.String, label: Schema.String })),
  links: Schema.Array(
    Schema.Struct({ source: Schema.String, target: Schema.String, value: Schema.Finite }),
  ),
  income: Schema.Finite,
  expense: Schema.Finite,
});

const Months = Schema.Array(
  Schema.Struct({
    month: Schema.String,
    income: Schema.Finite,
    expense: Schema.Finite,
    balance: Schema.Finite,
  }),
);

const Sheet = Schema.Struct({
  left: Schema.Struct({
    currentAssets: Schema.Finite,
    fixedAssets: Schema.Finite,
    debtExcess: Schema.Finite,
  }),
  right: Schema.Struct({
    currentLiabilities: Schema.Finite,
    fixedLiabilities: Schema.Finite,
    netAssets: Schema.Finite,
  }),
  accounts: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      name: Schema.String,
      class: Schema.String,
      amount: Schema.Finite,
      basis: Schema.String,
    }),
  ),
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

const BYTE_ORDER_MARK = String.fromCodePoint(0xfe_ff);

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

const imported = decoded(Imported);

const page = decoded(Page);

const setUpAccounts = Effect.gen(function* setUpAccounts() {
  yield* value("upsert_account", { id: "bank", name: "銀行", class: "current-asset" });
  yield* value("upsert_account", { id: "card", name: "カード", class: "current-liability" });
});

const importBank = imported("import_csv", {
  account: "bank",
  source: "bank.csv",
  csv: BANK_CSV,
  headerRow: 3,
  columns: BANK_COLUMNS,
});

const importCard = imported("import_csv", {
  account: "card",
  source: "card.csv",
  csv: CARD_CSV,
  columns: CARD_COLUMNS,
});

const allRows = page("list_transactions", OCTOBER_TO_NOVEMBER).pipe(
  Effect.map(({ transactions }) => transactions),
);

const rowOf = (rows: readonly (typeof Row.Type)[], description: string): typeof Row.Type =>
  Option.getOrThrow(Arr.findFirst(rows, (row) => row.description === description));

it.effect("銀行の CSV の前置きと合計行を飛ばし、同じ日の同じ行も 2 件として取り込む", () =>
  Effect.gen(function* bank() {
    yield* setUpAccounts;
    const result = yield* importBank;
    const rows = yield* allRows;
    expect(result).toMatchObject({ added: 4, duplicates: 0 });
    expect(
      pipe(
        rows,
        Arr.map(({ date, amount, description }) => ({ date, amount, description })),
      ),
    ).toStrictEqual([
      { date: "2026-11-10", amount: -62_000, description: "ラクテンカ-ドサ-ビス" },
      { date: "2026-10-27", amount: -85_000, description: "ヤチン" },
      { date: "2026-10-27", amount: -85_000, description: "ヤチン" },
      { date: "2026-10-25", amount: 300_000, description: "キユウヨ カブシキガイシヤエイ" },
    ]);
  }),
);

it.effect("同じ CSV をもう一度取り込んでも行を重ねない", () =>
  Effect.gen(function* again() {
    yield* setUpAccounts;
    yield* importBank;
    const second = yield* importBank;
    const rows = yield* allRows;
    expect(second).toStrictEqual({ importId: null, added: 0, duplicates: 4 });
    expect(rows).toHaveLength(4);
  }),
);

it.effect("Cloudflare・Claude・OpenRouter・fal の支払いは全角でもインフラに入る", () =>
  Effect.gen(function* infrastructure() {
    yield* setUpAccounts;
    yield* importCard;
    const rows = yield* allRows;
    expect(
      pipe(
        rows,
        Arr.map(({ description, category, label }) => ({ description, category, label })),
      ),
    ).toStrictEqual([
      { description: "CLOUDFLARE", category: "infrastructure", label: "Cloudflare" },
      { description: "スーパーマーケット", category: "other-expense", label: null },
      { description: "fal.ai", category: "infrastructure", label: "fal" },
      { description: "OPENROUTER INC", category: "infrastructure", label: "OpenRouter" },
      { description: "ANTHROPIC", category: "infrastructure", label: "Claude" },
      { description: "CLOUDFLARE", category: "infrastructure", label: "Cloudflare" },
    ]);
  }),
);

it.effect("規則を足すと、手で決めた取引を除いて既存の取引に当て直す", () =>
  Effect.gen(function* rules() {
    yield* setUpAccounts;
    yield* importBank;
    const before = yield* allRows;
    yield* value("set_category", {
      transactionId: rowOf(before, "ラクテンカ-ドサ-ビス").id,
      category: "transfer",
    });
    yield* value("set_category_rule", { pattern: "ﾔﾁﾝ", category: "housing" });
    yield* value("set_category_rule", { pattern: "キュウヨ", category: "salary" });
    yield* value("set_category_rule", { pattern: "キユウヨ", category: "salary" });
    yield* value("set_category_rule", { pattern: "らくてん", category: "food" });
    const after = yield* allRows;
    expect(
      pipe(
        after,
        Arr.map(({ category, manual }) => ({ category, manual })),
      ),
    ).toStrictEqual([
      { category: "transfer", manual: true },
      { category: "housing", manual: false },
      { category: "housing", manual: false },
      { category: "salary", manual: false },
    ]);
  }),
);

it.effect("auto で手の決定をやめると規則に戻り、規則を消すと既定に戻る", () =>
  Effect.gen(function* auto() {
    yield* setUpAccounts;
    yield* importBank;
    yield* value("set_category_rule", { pattern: "ヤチン", category: "housing", label: "家賃" });
    const rent = rowOf(yield* allRows, "ヤチン");
    yield* value("set_category", { transactionId: rent.id, category: "living" });
    yield* value("set_category", { transactionId: rent.id, category: "auto" });
    const restored = rowOf(yield* allRows, "ヤチン");
    yield* value("delete_category_rule", { pattern: "ヤチン" });
    const removed = rowOf(yield* allRows, "ヤチン");
    expect([restored, removed].map(({ category, label }) => ({ category, label }))).toStrictEqual([
      { category: "housing", label: "家賃" },
      { category: "other-expense", label: null },
    ]);
  }),
);

it.effect("サンキー図は振替を除き、左右の合計を貯金でそろえる", () =>
  Effect.gen(function* flow() {
    yield* setUpAccounts;
    yield* importBank;
    yield* importCard;
    yield* value("set_category_rule", { pattern: "ヤチン", category: "housing" });
    yield* value("set_category_rule", { pattern: "キユウヨ", category: "salary" });
    yield* value("set_category_rule", { pattern: "ラクテンカ", category: "transfer" });
    const result = yield* decoded(Flow)("money_flow", OCTOBER_TO_NOVEMBER);
    const into = (target: string): number =>
      pipe(
        result.links,
        Arr.filter((link) => link.target === target),
        Arr.reduce(0, (sum, link) => sum + link.value),
      );
    const out = (source: string): number =>
      pipe(
        result.links,
        Arr.filter((link) => link.source === source),
        Arr.reduce(0, (sum, link) => sum + link.value),
      );
    expect({ income: result.income, expense: result.expense }).toStrictEqual({
      income: 300_000,
      expense: 210_820,
    });
    expect(into("total")).toBe(out("total"));
    expect(into("expense:infrastructure")).toBe(out("expense:infrastructure"));
    expect(
      pipe(
        result.links,
        Arr.filter((link) => link.source === "expense:infrastructure"),
        Arr.map(({ target, value: amount }) => [target, amount] as const),
        Rec.fromEntries,
      ),
    ).toStrictEqual({
      "expense:infrastructure:Cloudflare": 3120,
      "expense:infrastructure:Claude": 30_000,
      "expense:infrastructure:OpenRouter": 1500,
      "expense:infrastructure:fal": 2000,
    });
    expect(Arr.findFirst(result.links, (link) => link.target === "expense:savings")).toStrictEqual(
      Option.some({ source: "total", target: "expense:savings", value: 89_180 }),
    );
  }),
);

it.effect("月ごとの収支は取引の無い月も 0 で返す", () =>
  Effect.gen(function* months() {
    yield* setUpAccounts;
    yield* importCard;
    const result = yield* decoded(Months)("monthly_totals", { from: "2026-09", to: "2026-11" });
    expect(result).toStrictEqual([
      { month: "2026-09", income: 0, expense: 0, balance: 0 },
      { month: "2026-10", income: 0, expense: 39_220, balance: -39_220 },
      { month: "2026-11", income: 0, expense: 1600, balance: -1600 },
    ]);
  }),
);

it.effect("貸借対照表は残高の記録に後の取引を足し、負債は借りている額で数える", () =>
  Effect.gen(function* sheet() {
    yield* setUpAccounts;
    yield* importBank;
    yield* importCard;
    yield* value("record_balance", { account: "bank", date: "2026-10-26", balance: 500_000 });
    const result = yield* decoded(Sheet)("balance_sheet", { asOf: "2026-10-31" });
    expect(result.left).toStrictEqual({ currentAssets: 330_000, fixedAssets: 0, debtExcess: 0 });
    expect(result.right).toStrictEqual({
      currentLiabilities: 39_220,
      fixedLiabilities: 0,
      netAssets: 290_780,
    });
    expect(result.accounts).toStrictEqual([
      { id: "bank", name: "銀行", class: "current-asset", amount: 330_000, basis: "snapshot" },
      {
        id: "card",
        name: "カード",
        class: "current-liability",
        amount: 39_220,
        basis: "transactions",
      },
    ]);
  }),
);

it.effect("負債が資産を超えると債務超過に出す", () =>
  Effect.gen(function* excess() {
    yield* setUpAccounts;
    yield* importCard;
    const result = yield* decoded(Sheet)("balance_sheet", { asOf: "2026-11-30" });
    expect(result.left.debtExcess).toBe(40_820);
    expect(result.right.netAssets).toBe(0);
  }),
);

it.effect("取り込みを消すとその取引だけが消える", () =>
  Effect.gen(function* undo() {
    yield* setUpAccounts;
    yield* importBank;
    const card = yield* importCard;
    yield* value("delete_import", { importId: card.importId });
    const rows = yield* allRows;
    expect(rows).toHaveLength(4);
  }),
);

it.effect("読めない日付があれば、何も取り込まずに行の番号を返す", () =>
  Effect.gen(function* broken() {
    yield* setUpAccounts;
    const { isError, text } = yield* call("import_csv", {
      account: "card",
      source: "broken.csv",
      csv: "利用日,利用店名・商品名,利用金額\n2026/10/03,A,100\n2026/13/01,B,200\n",
      columns: CARD_COLUMNS,
    });
    const rows = yield* allRows;
    expect(isError).toBe(true);
    expect(text).toContain("3 行目");
    expect(rows).toStrictEqual([]);
  }),
);

it.effect("無い口座には取り込まない", () =>
  Effect.gen(function* missing() {
    const { isError, text } = yield* call("import_csv", {
      account: "nowhere",
      source: "card.csv",
      csv: CARD_CSV,
      columns: CARD_COLUMNS,
    });
    expect(isError).toBe(true);
    expect(text).toContain("upsert_account");
  }),
);

it.effect("取引は 100 件ずつ、next を渡すと続きを返す", () =>
  Effect.gen(function* paging() {
    yield* setUpAccounts;
    const transactions = Arr.map(Arr.range(1, 150), (day) => ({
      date: "2026-10-01",
      amount: -day,
      description: `item ${day}`,
    }));
    yield* value("add_transactions", { account: "bank", source: "test", transactions });
    const first = yield* page("list_transactions", OCTOBER_TO_NOVEMBER);
    const second = yield* page("list_transactions", {
      ...OCTOBER_TO_NOVEMBER,
      cursor: first.next,
    });
    const ids = Arr.map([...first.transactions, ...second.transactions], ({ id }) => id);
    expect([first.transactions.length, second.transactions.length, second.next]).toStrictEqual([
      100,
      50,
      null,
    ]);
    expect(new Set(ids).size).toBe(150);
  }),
);
