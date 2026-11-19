import { chordBars as barsOf, ruleCases } from "#/shared/lib/rule-cases.test.support.ts";

import { progressionsPlugin } from "./preset.ts";

ruleCases({
  plugin: progressionsPlugin,
  rule: "named",
  valid: [
    { name: "a plain I–IV–V–I", song: barsOf(["C", "F", "G", "C"]) },
    { name: "one chord held", song: barsOf(["C", "C", "C", "C"]) },
  ],
  invalid: [
    {
      name: "王道進行 in C",
      song: barsOf(["F", "G", "Em", "Am"]),
      errors: ["2:9 王道進行 (IV–V–IIIm–VIm) starts in bar 1"],
    },
    {
      name: "王道進行 with sevenths in D",
      song: barsOf(["GM7", "A7", "F#m7", "Bm7"]),
      errors: ["2:9 王道進行 (IV–V–IIIm–VIm) starts in bar 1"],
    },
    {
      name: "丸サ進行 in C",
      song: barsOf(["FM7", "E7", "Am7", "FM7", "E7", "Am7"]),
      errors: [
        "2:9 丸サ進行 (Just the Two of Us) (IVM7–III7–VIm7) starts in bar 1",
        "14:9 丸サ進行 (Just the Two of Us) (IVM7–III7–VIm7) starts in bar 4",
      ],
    },
    {
      name: "小室進行 in A minor",
      song: barsOf(["Am", "F", "G", "C"]),
      errors: ["2:9 小室進行 (VIm–IV–V–I) starts in bar 1"],
    },
    {
      name: "ii–V–I in Bb",
      song: barsOf(["Cm7", "F7", "BbM7", "BbM7"]),
      errors: ["2:9 ii–V–I (IIm–V–I) starts in bar 1"],
    },
    {
      name: "the Andalusian cadence in A minor",
      song: barsOf(["Am", "G", "F", "E"]),
      errors: ["2:9 Andalusian cadence (VIm–V–IV–III) starts in bar 1"],
    },
    {
      name: "a progression that starts halfway through a bar, at that chord",
      song: `bar meter 4/4 tempo 120bpm {
  bass: C2 1/2, D2 1/2
  pad: [C3 E3 G3] 1/2, [C3 F3 A3] 1/2
}
bar {
  bass: G2 1/1
  pad: [D3 F3 B3] 1/1
}
bar {
  bass: C2 1/1
  pad: [C3 E3 G3] 1/1
}`,
      errors: ["2:17 ii–V–I (IIm–V–I) starts in bar 1"],
    },
  ],
});
