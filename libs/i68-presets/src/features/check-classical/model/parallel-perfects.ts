import { defineRule } from "@r_masseater/i68";
import type { Rule } from "@r_masseater/i68";
import { Match, Option } from "effect";

import { pitchClassOf } from "#/shared/lib/pitch.ts";
import { neighborsOf, reporterOf } from "#/shared/lib/voices.ts";
import type { Reporter } from "#/shared/lib/voices.ts";

import { outerVoicesOf } from "./outer-voices.ts";
import type { OuterPair } from "./outer-voices.ts";

const UNISON = 0;
const FIFTH = 7;
const STILL = 0;

const perfectName = (interval: number): Option.Option<string> =>
  Match.value(interval).pipe(
    Match.when(UNISON, () => Option.some("octaves")),
    Match.when(FIFTH, () => Option.some("fifths")),
    Match.orElse(() => Option.none()),
  );

const intervalOf = (pair: OuterPair): number => pitchClassOf(pair.melody.midi - pair.bass.midi);

const movesTogether = (previous: OuterPair, next: OuterPair): boolean => {
  const melody = Math.sign(next.melody.midi - previous.melody.midi);
  return melody !== STILL && melody === Math.sign(next.bass.midi - previous.bass.midi);
};

const checkMove =
  (report: Reporter) =>
  ([previous, next]: readonly [OuterPair, OuterPair]): void => {
    const name = perfectName(intervalOf(next));
    if (
      Option.isSome(name) &&
      intervalOf(previous) === intervalOf(next) &&
      movesTogether(previous, next)
    ) {
      report(`${String(next.melody.line)}:${String(next.tick)}`, {
        line: next.melody.line,
        column: next.melody.column,
        message: `Parallel ${name.value}: ${previous.melody.spelling}/${previous.bass.spelling} to ${next.melody.spelling}/${next.bass.spelling} between ${next.melody.track} and ${next.bass.track}`,
        detail: "Move the melody or the bass the other way",
      });
    }
  };

export const parallelPerfects: Rule = defineRule({
  meta: { description: "Melody and bass do not move in parallel fifths or octaves" },
  check: (context) => {
    const check = checkMove(reporterOf(context));
    for (const move of neighborsOf(outerVoicesOf(context.soundings))) {
      check(move);
    }
  },
});
