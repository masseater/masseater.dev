import { String as Str, pipe } from "effect";

import { STEPS_PER_BAR, STEPS_PER_BEAT, barSeconds } from "./song.ts";
import type { Timing } from "./song.ts";

const SECONDS_PER_MINUTE = 60;
const SECOND_DIGITS = 2;
const FIRST = 1;
const START = 0;
const SEMITONES = 12;
const OCTAVE_OFFSET = 1;
const KILO = 1000;
const TEN_KILO = 10_000;
const ONE_DECIMAL = 1;
const NO_DECIMALS = 0;
const LEVEL_DECIMALS = 2;
const NOTE_NAMES = ["C", "D♭", "D", "E♭", "E", "F", "G♭", "G", "A♭", "A", "B♭", "B"] as const;

export const clock = (seconds: number): string => {
  const whole = Math.floor(Math.max(START, seconds));
  const minutes = Math.floor(whole / SECONDS_PER_MINUTE);
  return `${minutes}:${pipe(String(whole % SECONDS_PER_MINUTE), Str.padStart(SECOND_DIGITS, "0"))}`;
};

export const barBeat =
  (timing: Timing) =>
  (seconds: number): string => {
    const bars = Math.max(START, seconds) / barSeconds(timing);
    const bar = Math.floor(bars);
    const step = Math.floor((bars - bar) * STEPS_PER_BAR);
    const beat = Math.floor(step / STEPS_PER_BEAT);
    return `${bar + FIRST}.${beat + FIRST}.${(step % STEPS_PER_BEAT) + FIRST}`;
  };

export const pitchClass = (pitch: number): number =>
  ((Math.round(pitch) % SEMITONES) + SEMITONES) % SEMITONES;

export const pitchName = (pitch: number): string => NOTE_NAMES[pitchClass(pitch)] ?? "";

export const noteName = (pitch: number): string =>
  `${pitchName(pitch)}${Math.floor(Math.round(pitch) / SEMITONES) - OCTAVE_OFFSET}`;

const kilohertz = (value: number): string => {
  if (value >= TEN_KILO) {
    return `${(value / KILO).toFixed(NO_DECIMALS)}kHz`;
  }
  return `${(value / KILO).toFixed(ONE_DECIMAL)}kHz`;
};

export const hertz = (value: number): string => {
  if (value >= KILO) {
    return kilohertz(value);
  }
  return `${Math.round(value)}Hz`;
};

export const level = (value: number): string => value.toFixed(LEVEL_DECIMALS);

export const isBlackKey = (pitch: number): boolean => pipe(pitchName(pitch), Str.includes("♭"));
