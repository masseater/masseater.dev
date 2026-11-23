import { Array as Arr, Number as Num, Option, Order, Record as Rec, pipe } from "effect";

import type { Step } from "#/shared/lib/degrees.ts";
import { longestContext } from "#/shared/lib/style-table.ts";
import type { StyleTable } from "#/shared/lib/style-table.ts";

const FIRST = 1;
const NEVER = 0;

export interface StyleSong {
  readonly name: string;
  readonly steps: readonly Step[];
}

export interface HabitLimits {
  readonly songs: number;
  readonly share: number;
  readonly baseline: number;
  readonly seen: number;
}

export interface Place {
  readonly song: string;
  readonly bar: number;
  readonly line: number;
  readonly column: number;
}

export interface Habit {
  readonly context: string;
  readonly next: string;
  readonly songs: number;
  readonly count: number;
  readonly share: number;
  readonly baselineShare: number;
  readonly evidence: readonly Place[];
}

export interface HabitInput {
  readonly songs: readonly StyleSong[];
  readonly baseline: StyleTable;
  readonly limits: HabitLimits;
}

interface Occurrence {
  readonly context: string;
  readonly next: string;
  readonly baselineShare: number;
  readonly place: Place;
}

const occurrencesIn =
  (baseline: StyleTable, limits: HabitLimits) =>
  (song: StyleSong): readonly Occurrence[] =>
    pipe(
      Arr.drop(
        Arr.makeBy(song.steps.length, (index) => index),
        FIRST,
      ),
      Arr.flatMap((index) => {
        const step = Arr.getUnsafe(song.steps, index);
        return pipe(
          longestContext(baseline, limits.seen, Arr.take(song.steps, index)),
          Option.map((context) => ({
            context: context.words,
            next: step.token,
            baselineShare:
              Option.getOrElse(Rec.get(context.next, step.token), () => NEVER) / context.total,
            place: { song: song.name, bar: step.bar, line: step.line, column: step.column },
          })),
          Option.filter((occurrence) => occurrence.baselineShare < limits.baseline),
          Option.toArray,
        );
      }),
    );

const matches = (tokens: readonly string[], words: string): boolean =>
  Arr.join(tokens, " ") === words;

const styleShareOf =
  (songs: readonly StyleSong[]) =>
  (context: string, next: string): number => {
    const { length } = context.split(" ");
    const following = pipe(
      songs,
      Arr.flatMap((song) => {
        const tokens = Arr.map(song.steps, (step) => step.token);
        return pipe(
          Arr.makeBy(tokens.length, (index) => index),
          Arr.filter(
            (index) => index >= length && matches(tokens.slice(index - length, index), context),
          ),
          Arr.map((index) => Arr.getUnsafe(tokens, index)),
        );
      }),
    );
    return Arr.countBy(following, (token) => token === next) / following.length;
  };

const habitOf =
  (share: (context: string, next: string) => number) =>
  (same: Arr.NonEmptyReadonlyArray<Occurrence>): Habit => {
    const first = Arr.headNonEmpty(same);
    return {
      context: first.context,
      next: first.next,
      songs: pipe(
        same,
        Arr.map((occurrence) => occurrence.place.song),
        Arr.dedupe,
        Arr.length,
      ),
      count: same.length,
      share: share(first.context, first.next),
      baselineShare: first.baselineShare,
      evidence: Arr.map(same, (occurrence) => occurrence.place),
    };
  };

const byReach = Order.combine(
  Order.mapInput(Num.Order, (habit: Habit) => -habit.songs),
  Order.mapInput(Num.Order, (habit: Habit) => -habit.count),
);

export const habitsOf = ({ songs, baseline, limits }: HabitInput): readonly Habit[] =>
  pipe(
    songs,
    Arr.flatMap(occurrencesIn(baseline, limits)),
    Arr.groupBy((occurrence) => `${occurrence.context}\u0000${occurrence.next}`),
    Rec.values,
    Arr.map(habitOf(styleShareOf(songs))),
    Arr.filter((habit) => habit.songs >= limits.songs && habit.share >= limits.share),
    Arr.sort(byReach),
  );
