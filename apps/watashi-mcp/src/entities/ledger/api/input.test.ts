import { Schema } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { MoneyReadInput } from "./input.ts";

const readable = Schema.is(MoneyReadInput);

const page = (cursor: string): unknown => ({
  view: "transactions",
  from: "2026-10",
  to: "2026-11",
  cursor,
});

describe("money_read の入力", () => {
  it("前のページの next でないカーソルを断る", () => {
    expect(readable(page("garbage"))).toBe(false);
    expect(readable(page("2026-02-30|12"))).toBe(false);
    expect(readable(page("2026-11-01|12"))).toBe(true);
  });

  it("暦に無い asOf を断る", () => {
    expect(readable({ view: "balance_sheet", asOf: "2026-02-30" })).toBe(false);
    expect(readable({ view: "balance_sheet", asOf: "2026-02-28" })).toBe(true);
  });
});
