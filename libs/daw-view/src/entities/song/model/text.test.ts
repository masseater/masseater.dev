import { describe, expect, it } from "vite-plus/test";

import { barBeat, clock, hertz, level, noteName } from "./text.ts";

const TIMING = { tempo: 160, swing: 0.62, bars: 80, tail: 1.6 } as const;
const SECONDS = { start: 0, long: 121.4, secondBar: 1.5, offBeat: 2.3 } as const;
const PITCH = { middle: 60, flat: 61, low: 36 } as const;
const HERTZ = { low: 150, middle: 1900, high: 20_000 } as const;
const HALF = 0.5;

describe("text", () => {
  it("writes seconds as minutes and seconds", () => {
    expect(clock(SECONDS.start)).toBe("0:00");
    expect(clock(SECONDS.long)).toBe("2:01");
  });

  it("writes a position as bar, beat and sixteenth", () => {
    expect(barBeat(TIMING)(SECONDS.start)).toBe("1.1.1");
    expect(barBeat(TIMING)(SECONDS.secondBar)).toBe("2.1.1");
    expect(barBeat(TIMING)(SECONDS.offBeat)).toBe("2.3.1");
  });

  it("names pitches with flats", () => {
    expect(noteName(PITCH.middle)).toBe("C4");
    expect(noteName(PITCH.flat)).toBe("D♭4");
    expect(noteName(PITCH.low)).toBe("C2");
  });

  it("shortens automation values", () => {
    expect(hertz(HERTZ.low)).toBe("150Hz");
    expect(hertz(HERTZ.middle)).toBe("1.9kHz");
    expect(hertz(HERTZ.high)).toBe("20kHz");
    expect(level(HALF)).toBe("0.50");
  });
});
