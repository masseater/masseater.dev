import { describe, expect, it } from "vite-plus/test";

import { meterChange } from "./song.test.support.ts";
import { timelineOf } from "./time.ts";

const timeline = timelineOf(meterChange);

const CHANGE = { bar: 3, beat: 1, tick: 0 };
const AFTER_CHANGE = { bar: 4, beat: 3, tick: 5 };
const PICKUP = { bar: 0, beat: 1, tick: 0 };

describe("timelineOf", () => {
  it("places bars after a meter change by the new bar length", () => {
    expect({
      change: timeline.tickOf(CHANGE),
      next: timeline.tickOf({ ...CHANGE, bar: AFTER_CHANGE.bar }),
    }).toStrictEqual({ change: 3840, next: 5280 });
  });

  it("turns ticks back into the same position", () => {
    expect(timeline.positionOf(timeline.tickOf(AFTER_CHANGE))).toStrictEqual(AFTER_CHANGE);
  });

  it("puts the pickup bar one bar before bar 1", () => {
    expect({
      tick: timeline.tickOf(PICKUP),
      position: timeline.positionOf(timeline.tickOf(PICKUP)),
    }).toStrictEqual({ tick: -1920, position: PICKUP });
  });
});
