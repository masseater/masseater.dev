import { defineRule } from "@r_masseater/i68";
import type { Rule } from "@r_masseater/i68";
import { Array as Arr, Option, Record as Rec, pipe } from "effect";

import { nameOf } from "#/shared/lib/pitch.ts";
import { isPitched, overlappingPairs, reporterOf } from "#/shared/lib/voices.ts";
import type { Pair, Reporter } from "#/shared/lib/voices.ts";

const LIMITS: Readonly<Record<string, number>> = {
  "1": 52,
  "2": 51,
  "3": 48,
  "4": 46,
  "5": 46,
  "6": 46,
  "7": 34,
  "8": 43,
  "9": 41,
  "10": 41,
  "11": 41,
};

const checkPair =
  (report: Reporter) =>
  (pair: Pair): void => {
    const [first, second] = pair;
    const low = Math.min(first.midi, second.midi);
    const gap = Math.abs(first.midi - second.midi);
    const limits = pipe(LIMITS, Rec.get(String(gap)), Option.toArray);
    for (const limit of limits) {
      if (low < limit) {
        report(`${String(second.line)}:${String(low)}:${String(gap)}`, {
          line: second.line,
          column: second.column,
          message: `${String(gap)} semitones between ${nameOf(first.midi)} (${first.track}) and ${nameOf(second.midi)} (${second.track}) is below its limit ${nameOf(limit)}`,
          detail: "Widen the interval or move the upper note up an octave",
        });
      }
    }
  };

export const lowIntervalLimit: Rule = defineRule({
  meta: { description: "Close intervals stay above the pitch where they turn muddy" },
  check: (context) => {
    const check = checkPair(reporterOf(context));
    for (const pair of overlappingPairs(pipe(context.soundings, Arr.filter(isPitched)))) {
      check(pair);
    }
  },
});
