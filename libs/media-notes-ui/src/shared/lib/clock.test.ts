import { describe, expect, it } from "@effect/vitest";

import { clock, preciseClock } from "./clock.ts";

const MINUTE_AND_FIVE = 65.7;

describe("clock", () => {
  it("formats a clock", () => {
    expect(clock(MINUTE_AND_FIVE)).toBe("1:05");
    expect(preciseClock(MINUTE_AND_FIVE)).toBe("1:05.7");
  });
});
