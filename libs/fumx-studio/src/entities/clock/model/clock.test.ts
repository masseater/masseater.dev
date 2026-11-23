import { describe, expect, it } from "@effect/vitest";
import { readSong } from "@r_masseater/fumx-parser";
import type { Song } from "@r_masseater/fumx-parser";
import { Array as Arr, Effect, Str, pipe } from "effect";

import { clockOf } from "./clock.ts";

const ENTRY = "/song.fumx";
const PRECISION = 9;
const SECONDS_PER_MINUTE = 60;

const songOf = (bars: readonly string[]): Effect.Effect<Song, Error> =>
  Effect.flatMap(
    readSong({
      path: ENTRY,
      read: () =>
        Effect.succeed(
          pipe(
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
            Arr.join("\n"),
          ),
        ),
    }),
    (source) => {
      if (source.status === "valid") {
        return Effect.succeed(source.song);
      }
      return Effect.fail(new Error(Str.trim(JSON.stringify(source))));
    },
  );

const startsOf = (song: Song): readonly number[] => {
  const clock = clockOf(song);
  return [
    ...pipe(
      song.bars,
      Arr.map((bar) => clock.secondsAt(bar.start)),
    ),
    clock.end,
  ];
};

const QUARTERS = 4;
const barSeconds = (from: number, to: number): number =>
  ((SECONDS_PER_MINUTE * QUARTERS) / (to - from)) * Math.log(to / from);
const FIRST = barSeconds(60, 90);
const SECOND = barSeconds(90, 120);
const WHOLE = barSeconds(60, 120);

describe("clockOf", () => {
  it.effect.each([
    ["a steady tempo", ["bar meter 4/4 tempo 120bpm", "bar"], [0, 2, 4]],
    [
      "a ramp that starts on the first bar",
      ["bar meter 4/4 tempo 60bpm -> 120bpm over 2bar", "bar", "bar", "bar"],
      [0, FIRST, FIRST + SECOND, FIRST + SECOND + 2, FIRST + SECOND + 4],
    ],
    [
      "a ramp that starts on a later bar",
      ["bar meter 4/4 tempo 120bpm", "bar tempo 60bpm -> 120bpm over 2bar", "bar", "bar"],
      [0, 2, 2 + FIRST, 2 + FIRST + SECOND, 4 + FIRST + SECOND],
    ],
    [
      "a one-bar ramp",
      ["bar meter 4/4 tempo 60bpm -> 120bpm over 1bar", "bar"],
      [0, WHOLE, WHOLE + 2],
    ],
  ] as const)("times bars under %s", ([, bars, expected]) =>
    Effect.gen(function* timed() {
      const song = yield* songOf(bars);
      const starts = startsOf(song);
      expect(starts).toHaveLength(expected.length);
      pipe(
        expected,
        Arr.forEach((seconds, index) => {
          expect(starts[index]).toBeCloseTo(seconds, PRECISION);
        }),
      );
    }),
  );
});
