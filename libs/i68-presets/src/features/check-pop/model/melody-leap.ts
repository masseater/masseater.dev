import { TICKS_PER_WHOLE } from "@r_masseater/fumx-parser";
import type { Sounding } from "@r_masseater/fumx-parser/analysis";
import { defineRule } from "@r_masseater/i68";
import type { Rule } from "@r_masseater/i68";
import { Array as Arr, pipe } from "effect";

import { numberOption } from "#/shared/lib/options.ts";
import { nameOf } from "#/shared/lib/pitch.ts";
import {
  MELODIC,
  hasRole,
  neighborsOf,
  reporterOf,
  topLineOf,
  tracksOf,
} from "#/shared/lib/voices.ts";
import type { Reporter } from "#/shared/lib/voices.ts";

const OCTAVE = 12;
const maxLeap = numberOption({ key: "max", fallback: OCTAVE });

const checkStep =
  (report: Reporter, max: number) =>
  ([previous, next]: readonly [Sounding, Sounding]): void => {
    const leap = Math.abs(next.midi - previous.midi);
    if (leap > max && next.start - previous.end < TICKS_PER_WHOLE) {
      report(`${String(next.line)}:${String(next.start)}`, {
        line: next.line,
        column: next.column,
        message: `${next.track} leaps ${String(leap)} semitones from ${nameOf(previous.midi)} to ${nameOf(next.midi)}`,
        detail: "Make the jump smaller, or step back the other way right after it",
      });
    }
  };

export const melodyLeap: Rule = defineRule({
  meta: { description: "A melody does not jump further than an octave from one note to the next" },
  check: (context) => {
    const check = checkStep(reporterOf(context), maxLeap(context.options));
    const melodic = pipe(context.soundings, Arr.filter(hasRole(MELODIC)));
    for (const track of tracksOf(melodic)) {
      for (const step of neighborsOf(topLineOf(track))) {
        check(step);
      }
    }
  },
});
