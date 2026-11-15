import { expect, it } from "@effect/vitest";
import { Array as Arr, Effect, Number as Num, Option, Record as Rec, Schema, pipe } from "effect";
import { afterAll, beforeEach, vi } from "vite-plus/test";

import { decoded, value, write, read } from "./money-client.test.support.ts";
import { closeDatabase, resetDatabase } from "./money-d1.test.support.ts";
import {
  OCTOBER_TO_NOVEMBER,
  importBank,
  importCard,
  setUpAccounts,
} from "./money-fixtures.test.support.ts";

vi.mock("cloudflare:workers", () => import("./money-d1.test.support.ts"));

beforeEach(() => Effect.runPromise(resetDatabase));
afterAll(() => Effect.runPromise(closeDatabase));

type Link = typeof LinkSchema.Type;

const LinkSchema = Schema.Struct({
  source: Schema.String,
  target: Schema.String,
  value: Schema.Finite,
});

const FlowSchema = Schema.Struct({
  nodes: Schema.Array(Schema.Struct({ id: Schema.String, label: Schema.String })),
  links: Schema.Array(LinkSchema),
  income: Schema.Finite,
  expense: Schema.Finite,
});

const MonthsSchema = Schema.Array(
  Schema.Struct({
    month: Schema.String,
    income: Schema.Finite,
    expense: Schema.Finite,
    balance: Schema.Finite,
  }),
);

const SheetSchema = Schema.Struct({
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

const sheet = decoded(SheetSchema);

const flowOf = decoded(FlowSchema)(read("flow"));

const setUpRules = Effect.gen(function* setUpRules() {
  yield* value(write("rule"))({ pattern: "ヤチン", category: "housing" });
  yield* value(write("rule"))({ pattern: "キユウヨ", category: "salary" });
  yield* value(write("rule"))({ pattern: "ラクテンカ", category: "transfer" });
});

const totalOf = (links: readonly Link[], matches: (link: Link) => boolean): number =>
  pipe(
    links,
    Arr.filter(matches),
    Arr.map((link) => link.value),
    Num.sumAll,
  );

it.effect("サンキー図は振替を除き、左右の合計を貯金でそろえる", () =>
  Effect.gen(function* flow() {
    yield* setUpAccounts;
    yield* importBank;
    yield* importCard;
    yield* setUpRules;
    const { links, income, expense } = yield* flowOf(OCTOBER_TO_NOVEMBER);
    expect({ income, expense }).toStrictEqual({ income: 300_000, expense: 210_820 });
    expect(totalOf(links, ({ target }) => target === "total")).toBe(
      totalOf(links, ({ source }) => source === "total"),
    );
    expect(
      pipe(
        links,
        Arr.filter(({ source }) => source === "expense:infrastructure"),
        Arr.map(({ target, value: amount }) => [target, amount] as const),
        Rec.fromEntries,
      ),
    ).toStrictEqual({
      "expense:infrastructure:Cloudflare": 3120,
      "expense:infrastructure:Claude": 30_000,
      "expense:infrastructure:OpenRouter": 1500,
      "expense:infrastructure:fal": 2000,
    });
    expect(
      pipe(
        links,
        Arr.findFirst(({ target }) => target === "expense:savings"),
      ),
    ).toStrictEqual(Option.some({ source: "total", target: "expense:savings", value: 89_180 }));
  }),
);

it.effect("月ごとの収支は取引の無い月も 0 で返す", () =>
  Effect.gen(function* months() {
    yield* setUpAccounts;
    yield* importCard;
    const result = yield* decoded(MonthsSchema)(read("monthly"))({
      from: "2026-09",
      to: "2026-11",
    });
    expect(result).toStrictEqual([
      { month: "2026-09", income: 0, expense: 0, balance: 0 },
      { month: "2026-10", income: 0, expense: 39_220, balance: -39_220 },
      { month: "2026-11", income: 0, expense: 1600, balance: -1600 },
    ]);
  }),
);

it.effect("貸借対照表は残高の記録に後の取引を足し、負債は借りている額で数える", () =>
  Effect.gen(function* balance() {
    yield* setUpAccounts;
    yield* importBank;
    yield* importCard;
    yield* value(write("balance"))({ account: "bank", date: "2026-10-26", balance: 500_000 });
    const result = yield* sheet(read("balance_sheet"))({ asOf: "2026-10-31" });
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
    const result = yield* sheet(read("balance_sheet"))({ asOf: "2026-11-30" });
    expect({ debtExcess: result.left.debtExcess, netAssets: result.right.netAssets }).toStrictEqual(
      {
        debtExcess: 40_820,
        netAssets: 0,
      },
    );
  }),
);
