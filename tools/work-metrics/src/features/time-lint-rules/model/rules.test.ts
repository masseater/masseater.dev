import { expect, test } from "vite-plus/test";

import { ruleCosts } from "./rules.ts";
import type { RuleSpan } from "./rules.ts";

const MILLI = 1_000_000;
const START = MILLI;
const TWO_MILLIS = 2;
const FOUR_MILLIS = 4;
const ONE_MILLI = 1;

const spanOf = (rule: string, millis: number): RuleSpan => ({
  name: "y8.rule",
  startTimeUnixNano: String(START),
  endTimeUnixNano: String(START + millis * MILLI),
  attributes: { "y8.rule.id": rule },
});

const diagnostics = {
  name: "lint.diagnostics",
  dataPoints: [
    {
      attributes: { "lint.check": "y8", "lint.rule": "MD001" },
      startTimeUnixNano: "1",
      asInt: "2",
    },
    {
      attributes: { "lint.check": "y8", "lint.rule": "MD001" },
      startTimeUnixNano: "1",
      asInt: "3",
    },
    {
      attributes: { "lint.check": "y8", "lint.rule": "MD001" },
      startTimeUnixNano: "2",
      asInt: "1",
    },
  ],
};

test("adds up the time of each rule and keeps the last count of each run", () => {
  const costs = ruleCosts([diagnostics])([
    spanOf("MD001", TWO_MILLIS),
    spanOf("MD001", FOUR_MILLIS),
    spanOf("MD009", ONE_MILLI),
    { ...spanOf("MD010", ONE_MILLI), name: "y8.check" },
  ]);
  expect(costs).toMatchObject([
    { linter: "y8", rule: "MD001", runs: 2, totalMillis: 6, maxMillis: 4, diagnostics: 4 },
    { linter: "y8", rule: "MD009", runs: 1, totalMillis: 1, diagnostics: 0 },
  ]);
});
