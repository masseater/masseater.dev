import { expect, it } from "@effect/vitest";
import { Array as Arr, Effect, Option, pipe } from "effect";
import { afterAll, beforeEach, vi } from "vite-plus/test";

import { value } from "./money-client.test.support.ts";
import { closeDatabase, resetDatabase } from "./money-d1.test.support.ts";
import { allRows, importBank, rowOf, setUpAccounts } from "./money-fixtures.test.support.ts";

vi.mock("cloudflare:workers", () => import("./money-d1.test.support.ts"));

beforeEach(() => Effect.runPromise(resetDatabase));
afterAll(() => Effect.runPromise(closeDatabase));

const rentRow = allRows.pipe(Effect.map((rows) => rowOf("ヤチン")(rows)));

it.effect("規則を足すと、手で決めた取引を除いて既存の取引に当て直す", () =>
  Effect.gen(function* rules() {
    yield* setUpAccounts;
    yield* importBank;
    const before = yield* allRows;
    yield* value("money_set_category")({
      transactionId: rowOf("ラクテンカ-ドサ-ビス")(before).id,
      category: "transfer",
    });
    yield* value("money_set_category_rule")({ pattern: "ﾔﾁﾝ", category: "housing" });
    yield* value("money_set_category_rule")({ pattern: "キュウヨ", category: "salary" });
    yield* value("money_set_category_rule")({ pattern: "キユウヨ", category: "salary" });
    yield* value("money_set_category_rule")({ pattern: "らくてん", category: "food" });
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
    yield* value("money_set_category_rule")({
      pattern: "ヤチン",
      category: "housing",
      label: "家賃",
    });
    const rent = yield* rentRow;
    yield* value("money_set_category")({ transactionId: rent.id, category: "living" });
    yield* value("money_set_category")({ transactionId: rent.id, category: "auto" });
    const restored = yield* rentRow;
    yield* value("money_delete_category_rule")({ pattern: "ヤチン" });
    const removed = yield* rentRow;
    expect(
      pipe(
        [restored, removed],
        Arr.map(({ category, label }) => ({ category, label })),
      ),
    ).toStrictEqual([
      { category: "housing", label: Option.some("家賃") },
      { category: "other-expense", label: Option.none() },
    ]);
  }),
);

it.effect("設定は組み込みの規則と自分で足した規則を分けて返す", () =>
  Effect.gen(function* settings() {
    yield* setUpAccounts;
    yield* value("money_set_category_rule")({ pattern: "ヤチン", category: "housing" });
    const result = yield* value("money_settings")({});
    expect(result).toMatchObject({
      rules: { user: [{ pattern: "ヤチン", category: "housing" }] },
    });
  }),
);
