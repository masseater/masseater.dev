import { describe, expect, it } from "@effect/vitest";
import { readSong } from "@r_masseater/fumx-parser";
import type { Song, SourceIssue } from "@r_masseater/fumx-parser";
import { Array as Arr, Effect, pipe } from "effect";

import { clockOf } from "./clock.ts";

const ENTRY = "/song.fumx";
const DIGITS = 9;
const SECONDS_PER_MINUTE = 60;
const QUARTERS_PER_BAR = 4;
const SLOW = 60;
const MIDDLE = 90;
const FAST = 120;
const START = 0;
const FAST_BAR = (SECONDS_PER_MINUTE * QUARTERS_PER_BAR) / FAST;

const barSeconds = (from: number, to: number): number =>
  ((SECONDS_PER_MINUTE * QUARTERS_PER_BAR) / (to - from)) * Math.log(to / from);

const FIRST = barSeconds(SLOW, MIDDLE);
const SECOND = barSeconds(MIDDLE, FAST);
const WHOLE = barSeconds(SLOW, FAST);
const BOTH = FIRST + SECOND;

interface Case {
  readonly name: string;
  readonly bars: readonly string[];
  readonly expected: readonly number[];
}

const textOf = (bars: readonly string[]): string =>
  Arr.join(
    [
      `song "t"`,
      `instrument keys sample "keys.flac" root C4`,
      `track keys instrument keys`,
      ...pipe(
        bars,
        Arr.map((head) => `${head} {\n  keys: C4 1/1\n}`),
      ),
      "",
    ],
    "\n",
  );

const songOf = (bars: readonly string[]): Effect.Effect<Song, readonly SourceIssue[]> =>
  Effect.flatMap(readSong({ path: ENTRY, read: () => Effect.succeed(textOf(bars)) }), (source) => {
    if (source.status === "valid") {
      return Effect.succeed(source.song);
    }
    return Effect.fail(source.issues);
  });

const rounded = (seconds: number): string => seconds.toFixed(DIGITS);

const startsOf = (song: Song): readonly string[] => {
  const clock = clockOf(song);
  const starts = pipe(
    song.bars,
    Arr.map((bar) => clock.secondsAt(bar.start)),
  );
  return pipe([...starts, clock.end], Arr.map(rounded));
};

const CASES: readonly Case[] = [
  {
    name: "a steady tempo",
    bars: [`bar meter 4/4 tempo ${String(FAST)}bpm`, "bar"],
    expected: [START, FAST_BAR, FAST_BAR + FAST_BAR],
  },
  {
    name: "a ramp that starts on the first bar",
    bars: [
      `bar meter 4/4 tempo ${String(SLOW)}bpm -> ${String(FAST)}bpm over 2bar`,
      "bar",
      "bar",
      "bar",
    ],
    expected: [START, FIRST, BOTH, BOTH + FAST_BAR, BOTH + FAST_BAR + FAST_BAR],
  },
  {
    name: "a ramp that starts on a later bar",
    bars: [
      `bar meter 4/4 tempo ${String(FAST)}bpm`,
      `bar tempo ${String(SLOW)}bpm -> ${String(FAST)}bpm over 2bar`,
      "bar",
      "bar",
    ],
    expected: [START, FAST_BAR, FAST_BAR + FIRST, FAST_BAR + BOTH, FAST_BAR + BOTH + FAST_BAR],
  },
  {
    name: "a one-bar ramp",
    bars: [`bar meter 4/4 tempo ${String(SLOW)}bpm -> ${String(FAST)}bpm over 1bar`, "bar"],
    expected: [START, WHOLE, WHOLE + FAST_BAR],
  },
];

describe("clockOf", () => {
  it.effect.each(CASES)("times bars under $name", ({ bars, expected }) =>
    Effect.gen(function* timed() {
      const song = yield* songOf(bars);
      expect(startsOf(song)).toStrictEqual(pipe(expected, Arr.map(rounded)));
    }),
  );
});
