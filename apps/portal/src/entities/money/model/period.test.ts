import { DateTime } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { asOfOf, periodOf, todayJst } from "./period.ts";

const TODAY = "2026-11-15";

describe("periodOf", () => {
  it("shows the twelve months up to this month by default", () => {
    expect(periodOf({ input: {}, today: TODAY })).toStrictEqual({ from: "2025-12", to: "2026-11" });
  });

  it("keeps the months the owner chose", () => {
    expect(periodOf({ input: { from: "2026-01", to: "2026-03" }, today: TODAY })).toStrictEqual({
      from: "2026-01",
      to: "2026-03",
    });
  });

  it("starts at the last month when the first is after it", () => {
    expect(periodOf({ input: { from: "2026-05", to: "2026-03" }, today: TODAY })).toStrictEqual({
      from: "2026-03",
      to: "2026-03",
    });
  });
});

describe("asOfOf", () => {
  it("uses the last day of a past month", () => {
    expect(asOfOf({ period: { from: "2026-01", to: "2026-02" }, today: TODAY })).toBe("2026-02-28");
  });

  it("uses today for this month", () => {
    expect(asOfOf({ period: { from: "2026-01", to: "2026-11" }, today: TODAY })).toBe(TODAY);
  });
});

describe("todayJst", () => {
  it("moves to the next day after 15:00 UTC", () => {
    expect(todayJst(DateTime.makeUnsafe("2026-11-15T15:30:00Z"))).toBe("2026-11-16");
  });
});
