import { Array as Arr, Option, String as Str, pipe } from "effect";
import { Note as TonalNote } from "tonal";

import type { Bar, Note, Song } from "#/entities/song/index.ts";
import { TICKS_PER_WHOLE } from "#/shared/lib/ticks.ts";

const FIRST = 1;
const NONE = 0;
const FULL = 1;
const BEATS = 4;
const BPM = 120;

export interface BarSpec {
  readonly bass: string;
  readonly keys: string;
}

const barOf = (index: number): Bar => ({
  index: index + FIRST,
  start: index * TICKS_PER_WHOLE,
  length: TICKS_PER_WHOLE,
  meter: { numerator: BEATS, denominator: BEATS, groups: [] },
  tempo: { bpm: BPM, ramp: Option.none() },
  tempoSteps: [],
  section: Option.none(),
  mark: Option.none(),
});

const notesOf =
  (track: string, bar: Bar) =>
  (pitches: string): readonly Note[] =>
    pipe(
      Str.split(" ")(pitches),
      Arr.map((pitch) => TonalNote.midi(pitch) ?? NONE),
      Arr.map((midi) => ({
        track,
        line: NONE,
        sourceLine: NONE,
        sourceColumn: NONE,
        bar: bar.index,
        offset: NONE,
        start: bar.start,
        length: bar.length,
        nudgeMilliseconds: NONE,
        nudgeSeconds: NONE,
        midi,
        cents: NONE,
        velocity: FULL,
        releaseVelocity: Option.none(),
        gate: FULL,
        articulation: Option.none(),
        lyric: Option.none(),
        bend: [],
        params: [],
        args: [],
      })),
    );

export const songOf = (specs: readonly BarSpec[]): Song => {
  const bars = pipe(
    specs,
    Arr.map((_spec, index) => barOf(index)),
  );
  return {
    title: "fixture",
    groove: Option.none(),
    samples: [],
    kits: [],
    instruments: [],
    plugins: [],
    buses: [],
    tracks: pipe(
      [
        ["bass", "bass"],
        ["keys", "harmony"],
      ] as const,
      Arr.map(([name, role]) => ({
        name,
        source: { kind: "audio" as const },
        into: Option.none(),
        mono: false,
        role: Option.some(role),
        mixer: { volumeDecibels: 0, pan: 0, muted: false },
        fx: [],
        sends: [],
      })),
    ),
    ducks: [],
    master: [],
    mix: Option.none(),
    tailSeconds: Option.none(),
    bars,
    notes: pipe(
      Arr.zip(bars, specs),
      Arr.flatMap(([bar, spec]) =>
        Arr.appendAll(notesOf("bass", bar)(spec.bass), notesOf("keys", bar)(spec.keys)),
      ),
    ),
    hits: [],
    slices: [],
    edits: [],
    automations: [],
    controls: [],
  };
};

export const twoFiveOne = songOf([
  { bass: "D2", keys: "F3 A3 C4" },
  { bass: "G2", keys: "F3 B3 D4" },
  { bass: "C2", keys: "E3 G3 B3" },
  { bass: "C2", keys: "E3 G3 B3" },
]);
