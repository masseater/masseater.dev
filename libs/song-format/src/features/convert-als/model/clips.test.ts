import { expect, it } from "@effect/vitest";
import { Array as Arr, Boolean as Bool, pipe } from "effect";

import { notesOfClip } from "./clips.ts";
import type { AlsClip } from "./live-set.ts";

interface NoteSpec {
  readonly time: number;
  readonly duration: number;
  readonly key: number;
  readonly velocity?: number;
  readonly enabled?: boolean;
}

interface Played {
  readonly beat: number;
  readonly length: number;
  readonly midi: number;
}

const DEFAULT_VELOCITY = 100;
const DEFAULT_RELEASE = 64;
const NO_OFFSET = 0;

const flagOf = (value: boolean): "true" | "false" =>
  Bool.match(value, { onFalse: () => "false", onTrue: () => "true" });

interface ClipSpec {
  readonly start: number;
  readonly end: number;
  readonly loopStart: number;
  readonly loopEnd: number;
  readonly startRelative?: number;
  readonly loopOn: boolean;
  readonly disabled?: boolean;
  readonly notes: readonly NoteSpec[];
}

const clipOf = (spec: ClipSpec): AlsClip => ({
  CurrentStart: { Value: spec.start },
  CurrentEnd: { Value: spec.end },
  Loop: {
    LoopStart: { Value: spec.loopStart },
    LoopEnd: { Value: spec.loopEnd },
    StartRelative: { Value: spec.startRelative ?? NO_OFFSET },
    LoopOn: { Value: flagOf(spec.loopOn) },
  },
  Disabled: { Value: flagOf(spec.disabled ?? false) },
  Notes: {
    KeyTracks: {
      KeyTrack: pipe(
        spec.notes,
        Arr.map((note) => ({
          MidiKey: { Value: note.key },
          Notes: {
            MidiNoteEvent: [
              {
                Time: note.time,
                Duration: note.duration,
                Velocity: note.velocity ?? DEFAULT_VELOCITY,
                OffVelocity: DEFAULT_RELEASE,
                IsEnabled: flagOf(note.enabled ?? true),
              },
            ],
          },
        })),
      ),
    },
  },
});

const played = (spec: ClipSpec): readonly Played[] =>
  pipe(
    notesOfClip(clipOf(spec)),
    Arr.map((note) => ({ beat: note.beat, length: note.length, midi: note.midi })),
  );

it("plays an unlooped clip from its start marker for the clip length", () => {
  expect(
    played({
      start: 8,
      end: 10,
      loopStart: 1,
      loopEnd: 4,
      loopOn: false,
      notes: [
        { time: 0, duration: 1, key: 60 },
        { time: 1, duration: 0.5, key: 62 },
        { time: 2.5, duration: 1, key: 64 },
        { time: 3.5, duration: 1, key: 65 },
      ],
    }),
  ).toStrictEqual([
    { beat: 8, length: 0.5, midi: 62 },
    { beat: 9.5, length: 0.5, midi: 64 },
  ]);
});

it("repeats a looped clip until the clip end", () => {
  expect(
    played({
      start: 0,
      end: 5,
      loopStart: 0,
      loopEnd: 2,
      loopOn: true,
      notes: [
        { time: 0, duration: 0.5, key: 60 },
        { time: 1, duration: 0.5, key: 62 },
      ],
    }),
  ).toStrictEqual([
    { beat: 0, length: 0.5, midi: 60 },
    { beat: 1, length: 0.5, midi: 62 },
    { beat: 2, length: 0.5, midi: 60 },
    { beat: 3, length: 0.5, midi: 62 },
    { beat: 4, length: 0.5, midi: 60 },
  ]);
});

it("starts a looped clip at the start marker and wraps to the loop start", () => {
  expect(
    played({
      start: 4,
      end: 8,
      loopStart: 0,
      loopEnd: 2,
      startRelative: 1,
      loopOn: true,
      notes: [
        { time: 0, duration: 0.5, key: 60 },
        { time: 1, duration: 0.5, key: 62 },
      ],
    }),
  ).toStrictEqual([
    { beat: 4, length: 0.5, midi: 62 },
    { beat: 5, length: 0.5, midi: 60 },
    { beat: 6, length: 0.5, midi: 62 },
    { beat: 7, length: 0.5, midi: 60 },
  ]);
});

it("wraps a start marker before the loop start into the loop", () => {
  expect(
    played({
      start: 0,
      end: 2,
      loopStart: 2,
      loopEnd: 4,
      startRelative: -1,
      loopOn: true,
      notes: [
        { time: 1, duration: 0.5, key: 59 },
        { time: 2, duration: 0.5, key: 60 },
        { time: 3, duration: 0.5, key: 62 },
      ],
    }),
  ).toStrictEqual([
    { beat: 0, length: 0.5, midi: 62 },
    { beat: 1, length: 0.5, midi: 60 },
  ]);
});

it("cuts a note at the loop end and at the clip end", () => {
  expect(
    played({
      start: 0,
      end: 3,
      loopStart: 0,
      loopEnd: 2,
      loopOn: true,
      notes: [{ time: 1.5, duration: 2, key: 60 }],
    }),
  ).toStrictEqual([{ beat: 1.5, length: 0.5, midi: 60 }]);
  expect(
    played({
      start: 0,
      end: 1,
      loopStart: 0,
      loopEnd: 4,
      loopOn: false,
      notes: [{ time: 0.5, duration: 2, key: 60 }],
    }),
  ).toStrictEqual([{ beat: 0.5, length: 0.5, midi: 60 }]);
});

it("skips disabled notes and disabled clips", () => {
  const spec: ClipSpec = {
    start: 0,
    end: 4,
    loopStart: 0,
    loopEnd: 4,
    loopOn: false,
    notes: [
      { time: 0, duration: 1, key: 60, velocity: 100, enabled: false },
      { time: 1, duration: 1, key: 62 },
    ],
  };
  expect(played(spec)).toStrictEqual([{ beat: 1, length: 1, midi: 62 }]);
  expect(played({ ...spec, disabled: true })).toStrictEqual([]);
});

it("rounds fractional velocities and keeps the release", () => {
  const notes = notesOfClip(
    clipOf({
      start: 0,
      end: 1,
      loopStart: 0,
      loopEnd: 1,
      loopOn: false,
      notes: [{ time: 0, duration: 1, key: 60, velocity: 99.6 }],
    }),
  );
  expect(
    pipe(
      notes,
      Arr.map((note) => ({ velocity: note.velocity, release: note.release })),
    ),
  ).toStrictEqual([{ velocity: 100, release: 64 }]);
});

it("orders the notes by start and pitch", () => {
  expect(
    played({
      start: 0,
      end: 2,
      loopStart: 0,
      loopEnd: 2,
      loopOn: false,
      notes: [
        { time: 1, duration: 1, key: 64 },
        { time: 0, duration: 1, key: 67 },
        { time: 0, duration: 1, key: 60 },
      ],
    }),
  ).toStrictEqual([
    { beat: 0, length: 1, midi: 60 },
    { beat: 0, length: 1, midi: 67 },
    { beat: 1, length: 1, midi: 64 },
  ]);
});
