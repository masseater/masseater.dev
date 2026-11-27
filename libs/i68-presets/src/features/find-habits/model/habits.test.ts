import { expect, it } from "@effect/vitest";
import { Array as Arr, Effect, Option, Record as Rec, pipe } from "effect";

import { chordBars, songText } from "#/shared/lib/rule-cases.test.support.ts";
import type { StyleTable } from "#/shared/lib/style-table.ts";

import { habitsOf } from "./habits.ts";
import type { Habit, HabitLimits, StyleSong } from "./habits.ts";
import { styleSongFromText } from "./read.ts";

const OFTEN = 18;
const RARE = 1;
const ALWAYS = 10;
const PERCENT = 100;

const BASELINE: StyleTable = {
  name: "baseline",
  source: "test",
  order: 2,
  transitions: Rec.fromEntries([
    [
      "I",
      Rec.fromEntries([
        ["IV", OFTEN],
        ["V", RARE],
        ["VIm", RARE],
      ]),
    ],
    ["IV", Rec.fromEntries([["V", ALWAYS]])],
    ["V", Rec.fromEntries([["I", ALWAYS]])],
  ]),
};

const LIMITS: HabitLimits = { songs: 2, share: 0.3, baseline: 0.1, seen: 5 };

const songOf = (name: string, chords: readonly string[]): Effect.Effect<StyleSong> =>
  styleSongFromText({ name, text: songText(chordBars(chords)) }).pipe(Effect.orDie);

interface Summary {
  readonly context: string;
  readonly next: string;
  readonly songs: number;
  readonly count: number;
  readonly percent: number;
  readonly baselinePercent: number;
}

const summary = (habits: readonly Habit[]): readonly Summary[] =>
  pipe(
    habits,
    Arr.map((habit) => ({
      context: habit.context,
      next: habit.next,
      songs: habit.songs,
      count: habit.count,
      percent: Math.round(habit.share * PERCENT),
      baselinePercent: Math.round(habit.baselineShare * PERCENT),
    })),
  );

const evidenceOf = (
  habits: readonly Habit[],
): readonly { readonly song: string; readonly bar: number }[] =>
  pipe(
    Arr.head(habits),
    Option.map((habit) =>
      pipe(
        habit.evidence,
        Arr.map((place) => ({ song: place.song, bar: place.bar })),
      ),
    ),
    Option.getOrElse(() => []),
  );

it.effect("finds a change the songs share that the baseline rarely makes", () =>
  Effect.gen(function* shared() {
    const songs = [
      yield* songOf("one", ["C", "Am", "F", "G", "C"]),
      yield* songOf("two", ["C", "Am", "F", "G", "C", "Am"]),
    ];
    const habits = habitsOf({ songs, baseline: BASELINE, limits: LIMITS });
    expect(summary(habits)).toStrictEqual([
      { context: "I", next: "VIm", songs: 2, count: 3, percent: 100, baselinePercent: 5 },
    ]);
    expect(evidenceOf(habits)).toStrictEqual([
      { song: "one", bar: 2 },
      { song: "two", bar: 2 },
      { song: "two", bar: 6 },
    ]);
  }),
);

it.effect("ignores changes the baseline makes often", () =>
  Effect.gen(function* usual() {
    const songs = [
      yield* songOf("one", ["C", "F", "G", "C"]),
      yield* songOf("two", ["C", "F", "G", "C"]),
    ];
    expect(habitsOf({ songs, baseline: BASELINE, limits: LIMITS })).toStrictEqual([]);
  }),
);

it.effect("needs the change in enough songs", () =>
  Effect.gen(function* once() {
    const songs = [
      yield* songOf("one", ["C", "Am", "F", "G", "C"]),
      yield* songOf("two", ["C", "F", "G", "C"]),
    ];
    expect(habitsOf({ songs, baseline: BASELINE, limits: LIMITS })).toStrictEqual([]);
    expect(
      summary(habitsOf({ songs, baseline: BASELINE, limits: { ...LIMITS, songs: 1 } })),
    ).toStrictEqual([
      { context: "I", next: "VIm", songs: 1, count: 1, percent: 50, baselinePercent: 5 },
    ]);
  }),
);

it.effect("needs the change to be what the songs usually do after that context", () =>
  Effect.gen(function* seldom() {
    const songs = [
      yield* songOf("one", ["C", "Am", "F", "G", "C", "F", "G", "C", "F", "G", "C", "F"]),
      yield* songOf("two", ["C", "Am", "F", "G", "C", "F", "G", "C", "F", "G", "C", "F"]),
    ];
    expect(habitsOf({ songs, baseline: BASELINE, limits: LIMITS })).toStrictEqual([]);
  }),
);

it.effect("puts the habits shared by the most songs first", () =>
  Effect.gen(function* ordered() {
    const songs = [
      yield* songOf("one", ["C", "G", "C", "Am"]),
      yield* songOf("two", ["C", "G", "C", "Am"]),
      yield* songOf("three", ["C", "G", "C"]),
    ];
    expect(summary(habitsOf({ songs, baseline: BASELINE, limits: LIMITS }))).toStrictEqual([
      { context: "I", next: "V", songs: 3, count: 3, percent: 60, baselinePercent: 5 },
      { context: "I", next: "VIm", songs: 2, count: 2, percent: 40, baselinePercent: 5 },
    ]);
  }),
);
