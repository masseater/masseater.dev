import type { Song } from "./song.ts";

const whole = { beat: 1, tick: 0, length: 1920, velocity: 0.8 };
const kick = { beat: 1, tick: 0, voice: "kick", velocity: 1 } as const;

export const twoFiveOne: Song = {
  title: "two five one",
  meter: [{ bar: 1, numerator: 4, denominator: 4 }],
  tempo: [{ bar: 1, beat: 1, tick: 0, bpm: 120 }],
  parts: [
    {
      kind: "pitched",
      name: "bass",
      role: "bass",
      notes: [
        { ...whole, bar: 1, pitch: "D2" },
        { ...whole, bar: 2, pitch: "G2" },
        { ...whole, bar: 3, pitch: "C2" },
        { ...whole, bar: 4, pitch: "C2" },
      ],
    },
    {
      kind: "pitched",
      name: "keys",
      role: "harmony",
      notes: [
        { ...whole, bar: 1, pitch: "F3" },
        { ...whole, bar: 1, pitch: "A3" },
        { ...whole, bar: 1, pitch: "C4" },
        { ...whole, bar: 2, pitch: "F3" },
        { ...whole, bar: 2, pitch: "B3" },
        { ...whole, bar: 2, pitch: "D4" },
        { ...whole, bar: 3, pitch: "E3" },
        { ...whole, bar: 3, pitch: "G3" },
        { ...whole, bar: 3, pitch: "B3" },
        { ...whole, bar: 4, pitch: "E3" },
        { ...whole, bar: 4, pitch: "G3" },
        { ...whole, bar: 4, pitch: "B3" },
      ],
    },
    {
      kind: "drums",
      name: "drums",
      hits: [
        { ...kick, bar: 1 },
        { ...kick, bar: 2 },
        { ...kick, bar: 3 },
        { ...kick, bar: 4 },
      ],
    },
  ],
};

export const pickup: Song = {
  title: "pickup",
  meter: [{ bar: 1, numerator: 4, denominator: 4 }],
  tempo: [{ bar: 1, beat: 1, tick: 0, bpm: 120 }],
  parts: [
    {
      kind: "pitched",
      name: "lead",
      role: "melody",
      notes: [
        { bar: 0, beat: 4, tick: 0, pitch: "G4", length: 480, velocity: 0.8 },
        { ...whole, bar: 1, pitch: "C5" },
      ],
    },
  ],
};

export const silence: Song = {
  title: "silence",
  meter: [{ bar: 1, numerator: 4, denominator: 4 }],
  tempo: [{ bar: 1, beat: 1, tick: 0, bpm: 120 }],
  parts: [],
};

export const meterChange: Song = {
  ...silence,
  meter: [
    { bar: 1, numerator: 4, denominator: 4 },
    { bar: 3, numerator: 3, denominator: 4 },
  ],
};
