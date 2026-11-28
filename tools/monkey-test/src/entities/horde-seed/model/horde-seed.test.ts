import { describe, expect, it } from "vite-plus/test";

import { seedOfDay } from "./horde-seed.ts";

const FIRST = Date.parse("2026-11-28T00:00:00Z");
const LAST = Date.parse("2026-11-28T23:59:59.999Z");
const NEXT = Date.parse("2026-11-29T00:00:00Z");

describe("seedOfDay", () => {
  it("gives every moment of one UTC day the same seed", () => {
    expect(seedOfDay(FIRST)).toBe(seedOfDay(LAST));
    expect(seedOfDay(NEXT)).not.toBe(seedOfDay(LAST));
  });
});
