import { Array as Arr, Option, pipe } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { TICKS_PER_WHOLE } from "#/shared/lib/ticks.ts";

import { songOf, twoFiveOne } from "./analysis.test.support.ts";
import { analyze } from "./analysis.ts";
import { soundingsOf } from "./sounding.ts";

describe("analyze", () => {
  it("reads the chords from the bass and harmony parts", () => {
    const chords = pipe(
      analyze(twoFiveOne).chords,
      Arr.map((chord) => `${String(chord.from.bar)} ${chord.symbol}`),
    );
    expect(chords).toStrictEqual(["1 Dm7", "2 G7", "3 Cmaj7"]);
  });

  it("reads the key of the whole song", () => {
    const key = pipe(
      analyze(twoFiveOne).key,
      Option.map((found) => `${found.tonic} ${found.mode}`),
    );
    expect(key).toStrictEqual(Option.some("C major"));
  });

  it("finds bars that repeat the bar before them", () => {
    const repeats = pipe(
      analyze(twoFiveOne).repeats,
      Arr.map((range) => `${String(range.fromBar)}-${String(range.toBar)}`),
    );
    expect(repeats).toStrictEqual(["3-4"]);
  });

  it("returns nothing for a song without bars", () => {
    expect(analyze(songOf([]))).toStrictEqual({
      bars: 0,
      key: Option.none(),
      keys: [],
      chords: [],
      repeats: [],
    });
  });
});

describe("analyze positions", () => {
  it("gives each chord its start and end in ticks", () => {
    const spans = pipe(
      analyze(twoFiveOne).chords,
      Arr.map(
        (chord) =>
          `${String(chord.start / TICKS_PER_WHOLE)}-${String(chord.end / TICKS_PER_WHOLE)}`,
      ),
    );
    expect(spans).toStrictEqual(["0-1", "1-2", "2-4"]);
  });

  it("keeps the written spelling of each sounding note", () => {
    const spellings = pipe(
      soundingsOf(songOf([{ bass: "Eb2", keys: "D#4 F##4" }])),
      Arr.map((sounding) => sounding.spelling),
    );
    expect(spellings).toStrictEqual(["Eb2", "D#4", "F##4"]);
  });
});
