import { Schema } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { LifeReadInput, LifeStatsInput } from "./life-input.ts";

const readable = Schema.is(LifeReadInput);

const countable = Schema.is(LifeStatsInput);

describe("life_read と life_stats の入力", () => {
  it("日時として読めない from や asOf を断る", () => {
    expect(readable({ from: "昨日の夜" })).toBe(false);
    expect(readable({ asOf: "2026-02-30" })).toBe(false);
    expect(readable({ from: "2026-11-01", asOf: "2026-11-08T19:00" })).toBe(true);
  });

  it("from より前の to を断り、同じ日は通す", () => {
    expect(readable({ from: "2026-11-10", to: "2026-11-01" })).toBe(false);
    expect(readable({ from: "2026-11-08T19:00", to: "2026-11-08" })).toBe(true);
    expect(countable({ metrics: ["drinks"], from: "2026-12", to: "2026-11" })).toBe(false);
  });

  it("数として正確に持てない番号の ref を断る", () => {
    expect(readable({ ref: "life_event:99999999999999999999" })).toBe(false);
    expect(readable({ ref: "life_event:12" })).toBe(true);
  });
});
