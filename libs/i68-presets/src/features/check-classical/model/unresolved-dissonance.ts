import type { Song } from "@r_masseater/fumx-parser";
import type { Sounding } from "@r_masseater/fumx-parser/analysis";
import { defineRule } from "@r_masseater/i68";
import type { Rule } from "@r_masseater/i68";
import { Array as Arr, Option, Record as Rec, pipe } from "effect";

import { nameOf, pitchClassOf } from "#/shared/lib/pitch.ts";
import {
  MELODIC,
  hasRole,
  neighborsOf,
  reporterOf,
  topLineOf,
  tracksOf,
} from "#/shared/lib/voices.ts";
import type { Reporter } from "#/shared/lib/voices.ts";

import { outerVoicesOf } from "./outer-voices.ts";

const DISSONANT_STEPS = {
  minorSecond: 1,
  majorSecond: 2,
  fourth: 5,
  tritone: 6,
  minorSeventh: 10,
  majorSeventh: 11,
};
const DISSONANT = Rec.values(DISSONANT_STEPS);
const STEP_DOWN = Rec.values({ halfStep: -1, wholeStep: -2 });
const HALVES = 2;
const ON_BEAT = 0;

const strongLength = (length: number, numerator: number): number => {
  if (numerator % HALVES === ON_BEAT) {
    return length / HALVES;
  }
  return length;
};

const isStrongBeat =
  (song: Song) =>
  (sounding: Sounding): boolean =>
    pipe(
      song.bars,
      Arr.findFirst((bar) => bar.index === sounding.bar),
      Option.exists(
        (bar) =>
          (sounding.start - bar.start) % strongLength(bar.length, bar.meter.numerator) === ON_BEAT,
      ),
    );

type BassAt = (tick: number) => Option.Option<Sounding>;

const bassOf = (soundings: readonly Sounding[]): BassAt => {
  const pairs = outerVoicesOf(soundings);
  return (tick) =>
    pipe(
      pairs,
      Arr.findFirst((pair) => pair.tick === tick),
      Option.map((pair) => pair.bass),
    );
};

const checkNote =
  (report: Reporter, strong: (sounding: Sounding) => boolean, bassAt: BassAt) =>
  ([note, next]: readonly [Sounding, Option.Option<Sounding>]): void => {
    const dissonant = Option.exists(bassAt(note.start), (bass) =>
      Arr.contains(DISSONANT, pitchClassOf(note.midi - bass.midi)),
    );
    const resolved = Option.exists(next, (found) =>
      Arr.contains(STEP_DOWN, found.midi - note.midi),
    );
    if (strong(note) && dissonant && !resolved) {
      report(`${String(note.line)}:${String(note.start)}`, {
        line: note.line,
        column: note.column,
        message: `${nameOf(note.midi)} in ${note.track} is dissonant against the bass and does not step down`,
        detail: "Move the next note down a step",
      });
    }
  };

const withNext = (
  line: readonly Sounding[],
): readonly (readonly [Sounding, Option.Option<Sounding>])[] => [
  ...pipe(
    neighborsOf(line),
    Arr.map(([note, next]): readonly [Sounding, Option.Option<Sounding>] => [
      note,
      Option.some(next),
    ]),
  ),
  ...pipe(
    Arr.last(line),
    Option.map((note): readonly [Sounding, Option.Option<Sounding>] => [note, Option.none()]),
    Option.toArray,
  ),
];

export const unresolvedDissonance: Rule = defineRule({
  meta: { description: "A dissonant melody note on a strong beat steps down to resolve" },
  check: (context) => {
    const check = checkNote(
      reporterOf(context),
      isStrongBeat(context.song),
      bassOf(context.soundings),
    );
    const melodic = pipe(context.soundings, Arr.filter(hasRole(MELODIC)));
    for (const track of tracksOf(melodic)) {
      for (const entry of withNext(topLineOf(track))) {
        check(entry);
      }
    }
  },
});
