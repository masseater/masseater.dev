import type { RuleContext } from "@r_masseater/i68";
import { Array as Arr, Option, String as Str, pipe } from "effect";

import { progressionOf } from "#/shared/lib/degrees.ts";
import type { Step } from "#/shared/lib/degrees.ts";
import { mixFactsOf, placeIn, trackKeyOf } from "#/shared/lib/mix-facts.ts";
import type { MixFact, MixPlace } from "#/shared/lib/mix-facts.ts";
import { mixKeyOf } from "#/shared/lib/mix-habit.ts";
import type { MixHabit } from "#/shared/lib/mix-habit.ts";
import type { Subject } from "#/shared/lib/style-rules.ts";

const FIRST = 1;

export interface Occasion {
  readonly id: string;
  readonly line: number;
  readonly column: number;
  readonly holds: boolean;
}

type Chord = Extract<Subject, { readonly type: "chord" }>;

const follows = (before: readonly Step[], context: string): boolean => {
  const words = Str.split(" ")(context);
  return (
    before.length >= words.length &&
    pipe(
      Arr.takeRight(before, words.length),
      Arr.map((step) => step.token),
      Arr.join(" "),
    ) === context
  );
};

const chordOccasions =
  (context: RuleContext) =>
  (chord: Chord): readonly Occasion[] => {
    const steps = progressionOf(context.soundings)(context.song);
    return pipe(
      Arr.makeBy(steps.length, (index) => index),
      Arr.drop(FIRST),
      Arr.filter((index) => follows(Arr.take(steps, index), chord.context)),
      Arr.map((index) => {
        const step = Arr.getUnsafe(steps, index);
        return {
          id: String(index),
          line: step.line,
          column: step.column,
          holds: step.token === chord.next,
        };
      }),
    );
  };

const sectionStartsOf = (context: RuleContext): readonly number[] =>
  pipe(
    context.song.bars,
    Arr.drop(FIRST),
    Arr.filter((bar) => Option.isSome(bar.section) || Option.isSome(bar.mark)),
    Arr.map((bar) => bar.index),
  );

const occasionAt = (place: MixPlace, holds: boolean): Occasion => ({
  id: String(place.bar),
  line: place.line,
  column: place.column,
  holds,
});

const has =
  (facts: readonly MixFact[], habit: MixHabit) =>
  (bar: Option.Option<number>): boolean =>
    pipe(
      facts,
      Arr.some(
        (fact) =>
          mixKeyOf(fact.habit) === mixKeyOf(habit) &&
          Option.match(bar, { onNone: () => true, onSome: (at) => fact.place.bar === at }),
      ),
    );

const mixOccasions =
  (context: RuleContext) =>
  (habit: MixHabit): readonly Occasion[] => {
    const facts = mixFactsOf(context.soundings)(context.song);
    const place = placeIn(context.soundings);
    const tracks = pipe(
      context.song.tracks,
      Arr.filter((track) => trackKeyOf(track.name) === habit.track),
    );
    if (habit.type !== "move") {
      return pipe(
        tracks,
        Arr.map((track) =>
          occasionAt(place({ track: track.name, bar: FIRST }), has(facts, habit)(Option.none())),
        ),
      );
    }
    return pipe(
      tracks,
      Arr.flatMap((track) =>
        pipe(
          sectionStartsOf(context),
          Arr.map((bar) =>
            occasionAt(place({ track: track.name, bar }), has(facts, habit)(Option.some(bar))),
          ),
        ),
      ),
    );
  };

export const occasionsOf =
  (context: RuleContext) =>
  (subject: Subject): readonly Occasion[] => {
    if (subject.type === "chord") {
      return chordOccasions(context)(subject);
    }
    return mixOccasions(context)(subject);
  };
