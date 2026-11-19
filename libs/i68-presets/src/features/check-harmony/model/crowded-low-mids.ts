import type { Bar } from "@r_masseater/fumx-parser";
import { TICKS_PER_WHOLE } from "@r_masseater/fumx-parser";
import type { Sounding } from "@r_masseater/fumx-parser/analysis";
import { defineRule } from "@r_masseater/i68";
import type { Rule } from "@r_masseater/i68";
import { Array as Arr, Option, pipe } from "effect";

import { numberOption } from "#/shared/lib/options.ts";
import { hasRole, isPitched, reporterOf, soundingAt } from "#/shared/lib/voices.ts";
import type { Reporter } from "#/shared/lib/voices.ts";

const SIXTEENTHS_PER_WHOLE = 16;
const SIXTEENTH = TICKS_PER_WHOLE / SIXTEENTHS_PER_WHOLE;
const LOW_MID_FLOOR = 45;
const BASS_FLOOR = 40;
const LOW_MID_CEILING = 59;
const DEFAULT_MAX = 3;
const maxNotes = numberOption({ key: "max", fallback: DEFAULT_MAX });

const floorOf = (sounding: Sounding): number => {
  if (hasRole(["bass"])(sounding)) {
    return BASS_FLOOR;
  }
  return LOW_MID_FLOOR;
};

const inLowMids = (sounding: Sounding): boolean =>
  isPitched(sounding) && sounding.midi <= LOW_MID_CEILING && sounding.midi >= floorOf(sounding);

const stepsOf = (bar: Bar): readonly number[] =>
  Arr.makeBy(Math.ceil(bar.length / SIXTEENTH), (index) => bar.start + index * SIXTEENTH);

const crowdAt =
  (low: readonly Sounding[]) =>
  (tick: number): readonly Sounding[] =>
    pipe(
      soundingAt(low)(tick),
      Arr.dedupeWith((left, right) => left.track === right.track && left.midi === right.midi),
    );

const spellingsOf = (notes: readonly Sounding[]): string =>
  pipe(
    notes,
    Arr.map((note) => note.spelling),
    Arr.join(", "),
  );

const checkBar =
  (report: Reporter, low: readonly Sounding[], max: number) =>
  (bar: Bar): void => {
    const crowded = pipe(
      stepsOf(bar),
      Arr.map(crowdAt(low)),
      Arr.findFirst((notes) => notes.length > max),
    );
    for (const notes of Option.toArray(crowded)) {
      for (const first of Option.toArray(Arr.head(notes))) {
        report(String(bar.index), {
          line: first.line,
          column: first.column,
          message: `${String(notes.length)} notes crowd the low mids in bar ${String(bar.index)}: ${spellingsOf(notes)}`,
          detail: "Thin the chord or move notes out of A2-B3",
        });
      }
    }
  };

export const crowdedLowMids: Rule = defineRule({
  meta: { description: "Few notes pile up between A2 and B3 at once" },
  check: (context) => {
    const low = pipe(context.soundings, Arr.filter(inLowMids));
    const check = checkBar(reporterOf(context), low, maxNotes(context.options));
    for (const bar of context.song.bars) {
      check(bar);
    }
  },
});
