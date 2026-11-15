import { expect, it } from "@effect/vitest";
import { Array as Arr, Effect, Option, pipe } from "effect";
import { afterAll, beforeEach, vi } from "vite-plus/test";

import { call, value, write, read } from "./money-client.test.support.ts";
import { closeDatabase, resetDatabase } from "./money-d1.test.support.ts";
import {
  CARD_COLUMNS,
  CARD_CSV,
  OCTOBER_TO_NOVEMBER,
  allRows,
  importBank,
  importCard,
  page,
  setUpAccounts,
} from "./money-fixtures.test.support.ts";

vi.mock("cloudflare:workers", () => import("./money-d1.test.support.ts"));

beforeEach(() => Effect.runPromise(resetDatabase));
afterAll(() => Effect.runPromise(closeDatabase));

const MANY = 150;

const FIRST = 1;

const PAGE_SIZE = 100;

const BANK_ROWS = 4;

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
    expect(second).toStrictEqual({ importId: Option.none(), added: 0, duplicates: 4 });
    expect(rows).toHaveLength(BANK_ROWS);
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
        Arr.map(({ description, category, label }) => ({
          description,
          category,
          label: Option.getOrElse(label, () => "-"),
        })),
      ),
    ).toStrictEqual([
      { description: "CLOUDFLARE", category: "infrastructure", label: "Cloudflare" },
      { description: "スーパーマーケット", category: "other-expense", label: "-" },
      { description: "fal.ai", category: "infrastructure", label: "fal" },
      { description: "OPENROUTER INC", category: "infrastructure", label: "OpenRouter" },
      { description: "ANTHROPIC", category: "infrastructure", label: "Claude" },
      { description: "CLOUDFLARE", category: "infrastructure", label: "Cloudflare" },
    ]);
  }),
);

it.effect("取り込みを消すとその取引だけが消える", () =>
  Effect.gen(function* undo() {
    yield* setUpAccounts;
    yield* importBank;
    const card = yield* importCard;
    yield* value(write("delete_import"))({ importId: Option.getOrThrow(card.importId) });
    const rows = yield* allRows;
    expect(rows).toHaveLength(BANK_ROWS);
  }),
);

it.effect("読めない日付があれば、何も取り込まずに行の番号を返す", () =>
  Effect.gen(function* broken() {
    yield* setUpAccounts;
    const { isError, text } = yield* call(write("import_csv"))({
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

it.effect("引用符の閉じていない CSV は、何も取り込まずに行の番号を返す", () =>
  Effect.gen(function* unterminated() {
    yield* setUpAccounts;
    const { isError, text } = yield* call(write("import_csv"))({
      account: "card",
      source: "unterminated.csv",
      csv: '利用日,利用店名・商品名,利用金額\n2026/10/03,A,100\n2026/10/04,"B,200\n',
      columns: CARD_COLUMNS,
    });
    const rows = yield* allRows;
    expect(isError).toBe(true);
    expect(text).toContain("3 行目の CSV を読めません");
    expect(rows).toStrictEqual([]);
  }),
);

it.effect("無い口座には取り込まない", () =>
  Effect.gen(function* missing() {
    const { isError, text } = yield* call(write("import_csv"))({
      account: "nowhere",
      source: "card.csv",
      csv: CARD_CSV,
      columns: CARD_COLUMNS,
    });
    expect(isError).toBe(true);
    expect(text).toContain("op: account");
  }),
);

it.effect("取引は 100 件ずつ、next を渡すと続きを返す", () =>
  Effect.gen(function* paging() {
    yield* setUpAccounts;
    const transactions = pipe(
      Arr.range(FIRST, MANY),
      Arr.map((day) => ({ date: "2026-10-01", amount: -day, description: `item ${day}` })),
    );
    yield* value(write("transactions"))({ account: "bank", source: "test", transactions });
    const first = yield* page(read("transactions"))(OCTOBER_TO_NOVEMBER);
    const second = yield* page(read("transactions"))({
      ...OCTOBER_TO_NOVEMBER,
      cursor: Option.getOrThrow(first.next),
    });
    const ids = pipe(
      [...first.transactions, ...second.transactions],
      Arr.map(({ id }) => id),
      Arr.dedupe,
    );
    expect({ first: first.transactions.length, second: second.transactions.length }).toStrictEqual({
      first: PAGE_SIZE,
      second: MANY - PAGE_SIZE,
    });
    expect(second.next).toStrictEqual(Option.none());
    expect(ids).toHaveLength(MANY);
  }),
);
