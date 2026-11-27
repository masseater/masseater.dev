import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import { formatLab, parseLab, phonemeAt } from "./lab.ts";

const LAB = "0 1000000 pau\n1000000 2500000 a\n2500000 3000000 N";
const INSIDE_A = 0.175;
const HALF = 0.5;

describe("lab files", () => {
  it("reads times in units of 100 nanoseconds", () => {
    expect(parseLab(LAB)).toStrictEqual([
      { start: 0, end: 0.1, phoneme: "pau" },
      { start: 0.1, end: 0.25, phoneme: "a" },
      { start: 0.25, end: 0.3, phoneme: "N" },
    ]);
  });

  it("writes the same text back", () => {
    expect(formatLab(parseLab(LAB))).toBe(LAB);
  });

  it("finds the phoneme at a time and how far into it the time is", () => {
    const position = phonemeAt({ phonemes: parseLab(LAB), time: INSIDE_A });
    expect(Option.getOrThrow(position).phoneme.phoneme).toBe("a");
    expect(Option.getOrThrow(position).progress).toBeCloseTo(HALF);
  });

  it("finds nothing after the last phoneme", () => {
    expect(phonemeAt({ phonemes: parseLab(LAB), time: 1 })).toStrictEqual(Option.none());
  });
});
