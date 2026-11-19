import type { Sounding } from "@r_masseater/fumx-parser/analysis";
import { defineRule } from "@r_masseater/i68";
import type { Rule } from "@r_masseater/i68";
import { Array as Arr, Option, pipe } from "effect";

import { numberOption } from "#/shared/lib/options.ts";
import { hasRole, overlappingPairs, reporterOf } from "#/shared/lib/voices.ts";
import type { Pair, Reporter } from "#/shared/lib/voices.ts";

const UNISON = 0;
const within = numberOption({ key: "within", fallback: UNISON });
const isMelody = hasRole(["melody"]);
const isHarmony = hasRole(["harmony"]);

const placementOf = (distance: number, room: number): Option.Option<string> => {
  if (distance < UNISON) {
    return Option.some("above");
  }
  if (distance > UNISON && distance <= room) {
    return Option.some("just below");
  }
  return Option.none();
};

const checkPair =
  (report: Reporter, room: number) =>
  (pair: Pair): void => {
    const parts = Option.all({
      melody: pipe(pair, Arr.findFirst(isMelody)),
      chord: pipe(pair, Arr.findFirst(isHarmony)),
    });
    for (const { melody, chord } of Option.toArray(parts)) {
      for (const where of Option.toArray(placementOf(melody.midi - chord.midi, room))) {
        report(`${String(chord.line)}:${String(chord.column)}:${String(chord.bar)}`, {
          line: chord.line,
          column: chord.column,
          message: `${chord.spelling} in ${chord.track} sits ${where} the melody note ${melody.spelling}`,
          detail: "Keep the chord below the melody with some room between them",
        });
      }
    }
  };

const isPart = (sounding: Sounding): boolean => isMelody(sounding) || isHarmony(sounding);

export const chordAboveMelody: Rule = defineRule({
  meta: { description: "Chord parts stay below the lead melody" },
  check: (context) => {
    const check = checkPair(reporterOf(context), within(context.options));
    for (const pair of overlappingPairs(pipe(context.soundings, Arr.filter(isPart)))) {
      check(pair);
    }
  },
});
