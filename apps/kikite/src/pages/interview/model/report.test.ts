import { describe, expect, it } from "@effect/vitest";
import { Array as Arr, Option, pipe } from "effect";

import type { StrategyId } from "#strategies";

import type { Entry, Rating } from "./atoms.ts";
import { reportOf } from "./report.ts";

type Step =
  | Readonly<{ at: number; strategy: StrategyId; rating: Rating }>
  | Readonly<{ at: number }>;

const MEDIAN_MS = 2000;
const MAX_MS = 5000;
const WITHDRAWN = 3;
const ASKED_CONCRETE = 3;
const OPEN_FIRST = 4;
const OPEN_LAST = 1;
const NEXT_FIRST = 5;
const NEXT_LAST = 2;
const LATER = 60_000;

const STEPS: readonly Step[] = [
  { at: 1000, strategy: "concrete", rating: "good" },
  { at: 5000 },
  { at: 7000, strategy: "concrete", rating: "off" },
  { at: 10_000 },
  { at: 15_000, strategy: "hypothesis", rating: "good" },
  { at: 20_000 },
  { at: 21_000, strategy: "concrete", rating: "unrated" },
];

const entryOf = (step: Step, id: number): Entry => {
  if ("strategy" in step) {
    return { kind: "question", id, reason: "", question: "", ...step };
  }
  return { kind: "speech", id, text: "", ...step };
};

const REPORT = reportOf({
  entries: pipe(STEPS, Arr.map(entryOf)),
  choices: [{ chosen: "hypothesis", candidates: [] }],
  progress: [
    { at: 0, open: OPEN_FIRST, next: NEXT_FIRST },
    { at: LATER, open: OPEN_LAST, next: NEXT_LAST },
  ],
  withdrawn: WITHDRAWN,
});

describe("reportOf", () => {
  it("counts questions and ratings per strategy, most asked first", () => {
    expect(REPORT.rows).toStrictEqual([
      { strategy: "concrete", asked: ASKED_CONCRETE, good: 1, off: 1, picked: 0 },
      { strategy: "hypothesis", asked: 1, good: 1, off: 0, picked: 1 },
    ]);
  });

  it("measures the wait only for questions that follow speech", () => {
    expect(REPORT.wait).toStrictEqual(Option.some({ medianMs: MEDIAN_MS, maxMs: MAX_MS }));
  });

  it("compares the first and last summary", () => {
    expect(REPORT.change).toStrictEqual(
      Option.some({ open: [OPEN_FIRST, OPEN_LAST], next: [NEXT_FIRST, NEXT_LAST] }),
    );
  });

  it("has no wait or change before anything was said", () => {
    const empty = reportOf({ entries: [], choices: [], progress: [], withdrawn: 0 });
    expect([empty.rows, empty.wait, empty.change]).toStrictEqual([
      [],
      Option.none(),
      Option.none(),
    ]);
  });
});
