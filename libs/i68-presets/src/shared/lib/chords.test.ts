import { describe, expect, it } from "@effect/vitest";
import { String as Str } from "effect";

import { isCommonChord } from "./chords.ts";

describe("isCommonChord", () => {
  it.each([
    ["a major triad", "C E G"],
    ["a minor triad", "A C E"],
    ["a diminished triad", "B D F"],
    ["an augmented triad", "C E G#"],
    ["a dominant seventh", "G B D F"],
    ["a major seventh", "C E G B"],
    ["a minor seventh", "D F A C"],
    ["a half-diminished seventh", "B D F A"],
    ["a diminished seventh", "B D F Ab"],
    ["a suspended fourth", "C F G"],
    ["a suspended second", "C D G"],
    ["a sixth", "C E G A"],
    ["an added ninth", "C E G D"],
    ["a dominant ninth", "G B D F A"],
    ["a power chord", "C G"],
    ["a single note", "C"],
  ])("accepts %s", (_name, notes) => {
    expect(isCommonChord(Str.split(notes, " "))).toBe(true);
  });

  it.each([
    ["a major triad with a sharp fourth", "C E F#"],
    ["a cluster of three semitones", "C C# D"],
    ["a major triad with its minor second", "C C# E G"],
    ["a major triad with a tritone added", "C E G F#"],
  ])("rejects %s", (_name, notes) => {
    expect(isCommonChord(Str.split(notes, " "))).toBe(false);
  });
});
