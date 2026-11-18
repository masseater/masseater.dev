import { TICKS_PER_WHOLE } from "@r_masseater/fumx-parser";
import type { Sounding } from "@r_masseater/fumx-parser/analysis";
import { defineRule } from "@r_masseater/i68";
import type { Rule } from "@r_masseater/i68";
import { Array as Arr, pipe } from "effect";

import { numberOption } from "#/shared/lib/options.ts";
import { hasRole, neighborsOf, onsetsOf, reporterOf, tracksOf } from "#/shared/lib/voices.ts";
import type { Onset, Reporter } from "#/shared/lib/voices.ts";

const MAJOR_THIRD = 4;
const MIN_VOICES = 3;
const NEARBY_WHOLES = 1.5;
const NEARBY = NEARBY_WHOLES * TICKS_PER_WHOLE;
const maxMove = numberOption({ key: "max", fallback: MAJOR_THIRD });

interface Chord {
  readonly first: Sounding;
  readonly pitches: readonly number[];
}

const chordOf = (onset: Onset): Chord => ({
  first: Arr.headNonEmpty(onset),
  pitches: pipe(
    onset,
    Arr.map((sounding) => sounding.midi),
    Arr.dedupe,
  ),
});

const nearestMove =
  (from: readonly number[]) =>
  (pitch: number): number =>
    Math.min(
      ...pipe(
        from,
        Arr.map((other) => Math.abs(pitch - other)),
      ),
    );

const checkChange =
  (report: Reporter, max: number) =>
  ([previous, next]: readonly [Chord, Chord]): void => {
    const leaps = pipe(
      next.pitches,
      Arr.map(nearestMove(previous.pitches)),
      Arr.filter((move) => move > max),
    );
    if (next.first.start - previous.first.start <= NEARBY && Arr.isReadonlyArrayNonEmpty(leaps)) {
      report(`${String(next.first.line)}:${String(next.first.start)}`, {
        line: next.first.line,
        column: next.first.column,
        message: `${String(leaps.length)} voices of ${next.first.track} leap more than ${String(max)} semitones into the next chord`,
        detail: "Keep shared notes and move each voice to the closest note",
      });
    }
  };

const chordsOf = (track: readonly Sounding[]): readonly Chord[] =>
  pipe(
    onsetsOf(track),
    Arr.map(chordOf),
    Arr.filter((chord) => chord.pitches.length >= MIN_VOICES),
  );

export const voiceJump: Rule = defineRule({
  meta: { description: "Chord voices move to the nearest note of the next chord" },
  check: (context) => {
    const check = checkChange(reporterOf(context), maxMove(context.options));
    const harmony = pipe(context.soundings, Arr.filter(hasRole(["harmony"])));
    for (const track of tracksOf(harmony)) {
      for (const change of neighborsOf(chordsOf(track))) {
        check(change);
      }
    }
  },
});
