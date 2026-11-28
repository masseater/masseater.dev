import { Schema } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { SearchInput } from "./search-input.ts";

const searchable = Schema.is(SearchInput);

describe("検索の入力", () => {
  it("暦に無い日を断る", () => {
    expect(searchable({ startDate: "20261399" })).toBe(false);
    expect(searchable({ startDate: "20260230" })).toBe(false);
    expect(searchable({ startDate: "20280229" })).toBe(true);
  });

  it("startDate より前の endDate を断る", () => {
    expect(searchable({ startDate: "20261110", endDate: "20261101" })).toBe(false);
    expect(searchable({ startDate: "20261101", endDate: "20261101" })).toBe(true);
  });
});
