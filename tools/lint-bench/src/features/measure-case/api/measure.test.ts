import { describe, expect, it } from "vite-plus/test";

import { planOf } from "./measure.ts";

const BUDGET = 60_000;

const cases = [
  { probeMillis: 100, runs: 10, warmup: 1 },
  { probeMillis: 20_000, runs: 3, warmup: 1 },
  { probeMillis: 40_000, runs: 1, warmup: 0 },
  { probeMillis: 0, runs: 10, warmup: 1 },
];

describe("planOf", () => {
  it.each(cases)(
    "fits up to ten runs into the budget, with a warmup when two probes fit ($probeMillis ms)",
    ({ probeMillis, runs, warmup }) => {
      expect(planOf({ probeMillis, budgetMillis: BUDGET })).toEqual({ runs, warmup });
    },
  );
});
