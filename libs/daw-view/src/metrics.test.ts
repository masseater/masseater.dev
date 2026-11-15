import { Option } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { arrangeLevels, fittedScale, pageTarget, stepped } from "./metrics.ts";

const FIT = { long: 4, short: 119 } as const;
const STEPS = { first: 12, second: 24, third: 48, fourth: 96, widest: 192 } as const;
const LONG = [FIT.long, STEPS.first, STEPS.second, STEPS.third, STEPS.fourth, STEPS.widest];
const SHORT = [FIT.short, STEPS.widest];
const STEP = { in: 1, out: -1 } as const;
const PAGE = { scale: 100, width: 400, bar: 5.2, bars: 80, limit: 7600 } as const;
const SECOND_PAGE = 400;
const WHOLE_SONG = 8000;

describe("arrange zoom", () => {
  it("offers the fitted width and every wider step", () => {
    expect(arrangeLevels(FIT.long)).toStrictEqual(LONG);
    expect(arrangeLevels(FIT.short)).toStrictEqual(SHORT);
  });

  it("starts wide enough to read a long song", () => {
    expect(fittedScale(LONG)).toBe(STEPS.first);
    expect(fittedScale(SHORT)).toBe(FIT.short);
  });

  it("steps one level at a time and stops at the ends", () => {
    expect(stepped(SHORT)(FIT.short, STEP.in)).toBe(STEPS.widest);
    expect(stepped(SHORT)(FIT.short, STEP.out)).toBe(FIT.short);
  });
});

describe("following the playhead", () => {
  it("turns to the page that holds the playhead", () => {
    expect(pageTarget(PAGE)).toStrictEqual(Option.some(SECOND_PAGE));
  });

  it("stays put when the whole song is visible", () => {
    expect(pageTarget({ ...PAGE, width: WHOLE_SONG })).toStrictEqual(Option.none());
  });
});
