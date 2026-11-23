import { expect, it } from "@effect/vitest";
import { readSong } from "@r_masseater/fumx-parser";
import { soundingsOf } from "@r_masseater/fumx-parser/analysis";
import { Effect, Record as Rec } from "effect";

import { progressionOf } from "#/shared/lib/degrees.ts";
import { chordBars, songText } from "#/shared/lib/rule-cases.test.support.ts";
import type { StyleTable } from "#/shared/lib/style-table.ts";

import { habitsOf } from "./habits.ts";
import type { HabitLimits, StyleSong } from "./habits.ts";

const BASELINE: StyleTable = {
  name: "baseline",
  source: "test",
  order: 2,
  transitions: Rec.fromEntries([
    [
      "I",
      Rec.fromEntries([
        ["IV", 18],
        ["V", 1],
        ["VIm", 1],
      ]),
    ],
    ["IV", Rec.fromEntries([["V", 10]])],
    ["V", Rec.fromEntries([["I", 10]])],
  ]),
};

const LIMITS: HabitLimits = { songs: 2, share: 0.3, baseline: 0.1, seen: 5 };

const songOf = (name: string, chords: readonly string[]) =>
  Effect.gen(function* read() {
    const source = yield* readSong({
      path: `/${name}.fumx`,
      read: () => Effect.succeed(songText(chordBars(chords))),
    });
    if (source.status === "invalid") {
      return yield* Effect.die(new Error(`${name} is not a valid song`));
    }
    const song: StyleSong = {
      name,
      steps: progressionOf(soundingsOf(source.song))(source.song),
    };
    return song;
  });

const summary = (habits: ReturnType<typeof habitsOf>) =>
  habits.map((habit) => [
    habit.context,
    habit.next,
    habit.songs,
    habit.count,
    Math.round(habit.share * 100),
    Math.round(habit.baselineShare * 100),
  ]);

it.effect("finds a change the songs share that the baseline rarely makes", () =>
  Effect.gen(function* shared() {
    const songs = [
      yield* songOf("one", ["C", "Am", "F", "G", "C"]),
      yield* songOf("two", ["C", "Am", "F", "G", "C", "Am"]),
    ];
    const habits = habitsOf({ songs, baseline: BASELINE, limits: LIMITS });
    expect(summary(habits)).toStrictEqual([["I", "VIm", 2, 3, 100, 5]]);
    expect(habits[0]?.evidence.map((place) => [place.song, place.bar])).toStrictEqual([
      ["one", 2],
      ["two", 2],
      ["two", 6],
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
    ).toStrictEqual([["I", "VIm", 1, 1, 50, 5]]);
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
      ["I", "V", 3, 3, 60, 5],
      ["I", "VIm", 2, 2, 40, 5],
    ]);
  }),
);
