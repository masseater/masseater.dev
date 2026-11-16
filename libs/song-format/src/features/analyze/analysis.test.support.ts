import { Array as Arr, Option, String as Str, pipe } from "effect";
import { Note as TonalNote } from "tonal";

import type { Note } from "#/entities/song/events.ts";
import type { Bar, Song } from "#/entities/song/song.ts";
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
        bar: bar.index,
        offset: NONE,
        start: bar.start,
        length: bar.length,
        nudgeMilliseconds: NONE,
        midi,
        cents: NONE,
        velocity: FULL,
        gate: FULL,
        articulation: Option.none(),
        lyric: Option.none(),
        bend: [],
        params: [],
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
    buses: [],
    tracks: [
      { name: "bass", source: { kind: "audio" }, role: Option.some("bass"), fx: [], sends: [] },
      { name: "keys", source: { kind: "audio" }, role: Option.some("harmony"), fx: [], sends: [] },
    ],
    ducks: [],
    master: [],
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
  };
};

export const twoFiveOne = songOf([
  { bass: "D2", keys: "F3 A3 C4" },
  { bass: "G2", keys: "F3 B3 D4" },
  { bass: "C2", keys: "E3 G3 B3" },
  { bass: "C2", keys: "E3 G3 B3" },
]);
