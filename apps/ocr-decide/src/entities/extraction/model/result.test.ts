import { assert, it } from "@effect/vitest";
import { Array as Arr, Record as Rec, pipe } from "effect";

import { COPY } from "#/shared/config/index.ts";

import { linesOf } from "./result.ts";

const FIELD_LABELS = ["発行者", "発行日", "合計金額", "消費税額", "登録番号"];

const valuesOf = (lines: ReturnType<typeof linesOf>): Readonly<Record<string, string>> =>
  pipe(
    lines,
    Arr.map(({ label, value }): [string, string] => [label, value]),
    Rec.fromEntries,
  );

it("lists every invoice field, then the time and the cost", () => {
  const lines = linesOf({ values: {}, costUsd: 0.0123456, seconds: 4.26 });
  assert.deepStrictEqual(
    pipe(
      lines,
      Arr.map(({ label }) => label),
    ),
    [...FIELD_LABELS, COPY.seconds, COPY.cost],
  );
  const values = valuesOf(lines);
  assert.strictEqual(values[COPY.seconds], "4.3 秒");
  assert.strictEqual(values[COPY.cost], "$0.01235");
});

it("shows the text of a found field and a placeholder for the others", () => {
  const values = valuesOf(
    linesOf({
      values: { total: { status: "found", text: "11,000" } },
      costUsd: 0,
      seconds: 0,
    }),
  );
  assert.strictEqual(values["合計金額"], "11,000");
  assert.strictEqual(values["発行者"], COPY.missing);
});
