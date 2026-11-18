import type { Sounding } from "@r_masseater/fumx-parser/analysis";
import { defineRule } from "@r_masseater/i68";
import type { Rule } from "@r_masseater/i68";
import { Array as Arr, Match, Option, pipe } from "effect";

import { nameOf } from "#/shared/lib/pitch.ts";
import {
  hasRole,
  isPitched,
  overlappingPairs,
  reporterOf,
  sortByPitch,
} from "#/shared/lib/voices.ts";
import type { Pair, Reporter } from "#/shared/lib/voices.ts";

const MINOR_SECOND = 1;
const MINOR_NINTH = 13;
const CLUSTER_FLOOR = 59;

const isUpper = (sounding: Sounding): boolean =>
  isPitched(sounding) && !hasRole(["bass"])(sounding);

const nameOfGap = (gap: number): Option.Option<string> =>
  Match.value(gap).pipe(
    Match.when(MINOR_SECOND, () => Option.some("minor 2nd")),
    Match.when(MINOR_NINTH, () => Option.some("minor 9th")),
    Match.orElse(() => Option.none()),
  );

const isCluster = (low: Sounding, high: Sounding): boolean =>
  low.track === high.track && high.midi - low.midi === MINOR_SECOND && low.midi >= CLUSTER_FLOOR;

const checkPair =
  (report: Reporter) =>
  (pair: Pair): void => {
    const [low, high] = sortByPitch(pair);
    const [, later] = pair;
    for (const [bottom, top] of Option.toArray(
      Option.all([Option.fromNullishOr(low), Option.fromNullishOr(high)]),
    )) {
      for (const name of Option.toArray(nameOfGap(top.midi - bottom.midi))) {
        if (!isCluster(bottom, top)) {
          report(`${String(later.line)}:${String(bottom.midi)}:${String(top.midi)}`, {
            line: later.line,
            column: later.column,
            message: `${nameOf(top.midi)} (${top.track}) and ${nameOf(bottom.midi)} (${bottom.track}) clash a ${name} apart`,
            detail: "Move one of the two notes to a chord note",
          });
        }
      }
    }
  };

export const semitoneClash: Rule = defineRule({
  meta: { description: "Upper parts do not sound a minor 2nd or minor 9th apart" },
  check: (context) => {
    const check = checkPair(reporterOf(context));
    for (const pair of overlappingPairs(pipe(context.soundings, Arr.filter(isUpper)))) {
      check(pair);
    }
  },
});
