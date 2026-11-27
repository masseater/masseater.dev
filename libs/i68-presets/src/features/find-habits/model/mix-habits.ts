import { Array as Arr, Order, Record as Rec, pipe } from "effect";

import { mixKeyOf } from "#/shared/lib/mix-habit.ts";
import type { MixHabit } from "#/shared/lib/mix-habit.ts";

import type { Place, StyleSong } from "./habits.ts";

export interface MixHabitFound {
  readonly habit: MixHabit;
  readonly key: string;
  readonly songs: number;
  readonly count: number;
  readonly evidence: readonly Place[];
}

export interface MixHabitInput {
  readonly songs: readonly StyleSong[];
  readonly minSongs: number;
}

interface Seen {
  readonly habit: MixHabit;
  readonly key: string;
  readonly place: Place;
}

const seenIn = (song: StyleSong): readonly Seen[] =>
  pipe(
    song.mix,
    Arr.map((fact) => ({
      habit: fact.habit,
      key: mixKeyOf(fact.habit),
      place: { song: song.name, ...fact.place },
    })),
  );

const foundOf = (same: Arr.NonEmptyReadonlyArray<Seen>): MixHabitFound => {
  const first = Arr.headNonEmpty(same);
  return {
    habit: first.habit,
    key: first.key,
    songs: pipe(
      same,
      Arr.map((seen) => seen.place.song),
      Arr.dedupe,
      Arr.length,
    ),
    count: same.length,
    evidence: pipe(
      same,
      Arr.map((seen) => seen.place),
    ),
  };
};

const byReach = Order.combine(
  Order.mapInput(Order.Number, (found: MixHabitFound) => -found.songs),
  Order.mapInput(Order.Number, (found: MixHabitFound) => -found.count),
);

export const mixHabitsOf = ({ songs, minSongs }: MixHabitInput): readonly MixHabitFound[] =>
  pipe(
    songs,
    Arr.flatMap(seenIn),
    Arr.groupBy((seen) => seen.key),
    Rec.values,
    Arr.map(foundOf),
    Arr.filter((found) => found.songs >= minSongs),
    Arr.sortBy(byReach),
  );
