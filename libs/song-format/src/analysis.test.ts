import { Array as Arr, Option, pipe } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { analyze } from "./analysis.ts";
import { pickup, silence, twoFiveOne } from "./song.test.support.ts";

const FIRST_BAR = { bar: 1, beat: 1, tick: 0 };

describe("analyze", () => {
  it("reads the chords from the bass and harmony parts", () => {
    const chords = pipe(
      analyze(twoFiveOne).chords,
      Arr.map((chord) => ({ bar: chord.from.bar, symbol: chord.symbol })),
    );
    expect(chords).toStrictEqual([
      { bar: 1, symbol: "Dm7" },
      { bar: 2, symbol: "G7" },
      { bar: 3, symbol: "Cmaj7" },
    ]);
  });

  it("reads the key of the whole song", () => {
    const key = pipe(
      analyze(twoFiveOne).key,
      Option.map((found) => ({ tonic: found.tonic, mode: found.mode })),
    );
    expect(key).toStrictEqual(Option.some({ tonic: "C", mode: "major" }));
  });

  it("finds bars that repeat the bar before them", () => {
    expect(analyze(twoFiveOne).repeats).toStrictEqual([{ fromBar: 3, toBar: 4 }]);
  });

  it("keeps a pickup before bar 1", () => {
    const analysis = analyze(pickup);
    expect({
      bars: analysis.bars,
      from: Arr.head(analysis.chords).pipe(Option.map((chord) => chord.from)),
    }).toStrictEqual({
      bars: 1,
      from: Option.some(FIRST_BAR),
    });
  });

  it("returns nothing for a song without notes", () => {
    expect(analyze(silence)).toStrictEqual({
      bars: 0,
      key: Option.none(),
      keys: [],
      chords: [],
      repeats: [],
    });
  });
});
