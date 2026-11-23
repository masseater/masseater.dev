import { describe, expect, it } from "@effect/vitest";

import { symbolOf, tokensOf } from "./chordonomicon.ts";

describe("Chordonomicon chords", () => {
  it("spells chord symbols the way tonal reads them", () => {
    expect(
      ["Amin", "Csmin", "Fs7", "Bb", "C/B", "Dmaj7", "Ebmin7", "Gsdim", "Cadd9"].map(symbolOf),
    ).toStrictEqual(["Am", "C#m", "F#7", "Bb", "C", "Dmaj7", "Ebm7", "G#dim", "Cadd9"]);
  });

  it("turns a song into degrees of the key that fits its chords best", () => {
    expect(tokensOf("<intro_1> C <verse_1> F C G7 C Amin")).toStrictEqual([
      "I",
      "IV",
      "I",
      "V7",
      "I",
      "VIm",
    ]);
    expect(tokensOf("<verse_1> G C D Emin <chorus_1> C D G")).toStrictEqual([
      "I",
      "IV",
      "V",
      "VIm",
      "IV",
      "V",
      "I",
    ]);
  });

  it("names a minor song by its relative major", () => {
    expect(tokensOf("Amin Dmin Emin Amin")).toStrictEqual(["VIm", "IIm", "IIIm", "VIm"]);
  });

  it("joins repeated chords and skips symbols it cannot read", () => {
    expect(tokensOf("C C F nonsense F G")).toStrictEqual(["I", "IV", "V"]);
  });
});
