import type { Sounding } from "@r_masseater/fumx-parser/analysis";
import { defineRule } from "@r_masseater/i68";
import type { Rule } from "@r_masseater/i68";
import { Array as Arr, Match, Option, pipe } from "effect";

import { pitchClassOf } from "#/shared/lib/pitch.ts";
import {
  hasRole,
  isPitched,
  overlappingPairs,
  reporterOf,
  soundingAt,
  sortByPitch,
} from "#/shared/lib/voices.ts";
import type { Pair, Reporter } from "#/shared/lib/voices.ts";

const MINOR_SECOND = 1;
const MINOR_NINTH = 13;
const CLUSTER_FLOOR = 59;

const MAJOR_THIRD = 4;
const MINOR_SEVENTH = 10;
const isBass = hasRole(["bass"]);

type Excused = (bottom: Sounding, top: Sounding) => boolean;

const dominantOver =
  (soundings: readonly Sounding[]): Excused =>
  (bottom, top) => {
    if (!isBass(bottom) && !isBass(top)) {
      return false;
    }
    if (!isBass(bottom) || top.midi - bottom.midi !== MINOR_NINTH) {
      return true;
    }
    const classes = pipe(
      soundingAt(soundings)(top.start),
      Arr.map((other) => pitchClassOf(other.midi - bottom.midi)),
    );
    return Arr.contains(classes, MAJOR_THIRD) && Arr.contains(classes, MINOR_SEVENTH);
  };

const nameOfGap = (gap: number): Option.Option<string> =>
  Match.value(gap).pipe(
    Match.when(MINOR_SECOND, () => Option.some("minor 2nd")),
    Match.when(MINOR_NINTH, () => Option.some("minor 9th")),
    Match.orElse(() => Option.none()),
  );

const isCluster = (low: Sounding, high: Sounding): boolean =>
  low.track === high.track && high.midi - low.midi === MINOR_SECOND && low.midi >= CLUSTER_FLOOR;

const checkPair =
  (report: Reporter, excused: Excused) =>
  (pair: Pair): void => {
    const [low, high] = sortByPitch(pair);
    const [, later] = pair;
    for (const [bottom, top] of Option.toArray(
      Option.all([Option.fromNullishOr(low), Option.fromNullishOr(high)]),
    )) {
      for (const name of Option.toArray(nameOfGap(top.midi - bottom.midi))) {
        if (!isCluster(bottom, top) && !excused(bottom, top)) {
          report(`${String(later.line)}:${String(bottom.midi)}:${String(top.midi)}`, {
            line: later.line,
            column: later.column,
            message: `${top.spelling} (${top.track}) and ${bottom.spelling} (${bottom.track}) clash a ${name} apart`,
            detail: "Move one of the two notes to a chord note",
          });
        }
      }
    }
  };

export const semitoneClash: Rule = defineRule({
  meta: {
    description:
      "Parts do not sound a minor 2nd or minor 9th apart, except the flat 9th of a dominant over its bass",
  },
  check: (context) => {
    const pitched = pipe(context.soundings, Arr.filter(isPitched));
    const check = checkPair(reporterOf(context), dominantOver(pitched));
    for (const pair of overlappingPairs(pitched)) {
      check(pair);
    }
  },
});
