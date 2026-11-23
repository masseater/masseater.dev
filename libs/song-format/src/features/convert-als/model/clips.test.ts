import { describe, expect, it } from "@effect/vitest";

import { notesOfClip } from "./clips.ts";
import type { AlsClip } from "./live-set.ts";

interface ClipSpec {
  readonly start: number;
  readonly end: number;
  readonly loopStart: number;
  readonly loopEnd: number;
  readonly startRelative?: number;
  readonly loopOn: boolean;
  readonly disabled?: boolean;
  readonly notes: readonly (readonly [number, number, number, number?, boolean?])[];
}

const clipOf = (spec: ClipSpec): AlsClip => ({
  CurrentStart: { Value: spec.start },
  CurrentEnd: { Value: spec.end },
  Loop: {
    LoopStart: { Value: spec.loopStart },
    LoopEnd: { Value: spec.loopEnd },
    StartRelative: { Value: spec.startRelative ?? 0 },
    LoopOn: { Value: spec.loopOn ? "true" : "false" },
  },
  Disabled: { Value: spec.disabled === true ? "true" : "false" },
  Notes: {
    KeyTracks: {
      KeyTrack: spec.notes.map(([time, duration, key, velocity, enabled]) => ({
        MidiKey: { Value: key },
        Notes: {
          MidiNoteEvent: [
            {
              Time: time,
              Duration: duration,
              Velocity: velocity ?? 100,
              OffVelocity: 64,
              IsEnabled: enabled === false ? "false" : "true",
            },
          ],
        },
      })),
    },
  },
});

const played = (spec: ClipSpec) =>
  notesOfClip(clipOf(spec)).map((note) => [note.beat, note.length, note.midi]);

describe("arrangement MIDI clips", () => {
  it("plays an unlooped clip from its start marker for the clip length", () => {
    expect(
      played({
        start: 8,
        end: 10,
        loopStart: 1,
        loopEnd: 4,
        loopOn: false,
        notes: [
          [0, 1, 60],
          [1, 0.5, 62],
          [2.5, 1, 64],
          [3.5, 1, 65],
        ],
      }),
    ).toStrictEqual([
      [8, 0.5, 62],
      [9.5, 0.5, 64],
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
          [0, 0.5, 60],
          [1, 0.5, 62],
        ],
      }),
    ).toStrictEqual([
      [0, 0.5, 60],
      [1, 0.5, 62],
      [2, 0.5, 60],
      [3, 0.5, 62],
      [4, 0.5, 60],
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
          [0, 0.5, 60],
          [1, 0.5, 62],
        ],
      }),
    ).toStrictEqual([
      [4, 0.5, 62],
      [5, 0.5, 60],
      [6, 0.5, 62],
      [7, 0.5, 60],
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
          [1, 0.5, 59],
          [2, 0.5, 60],
          [3, 0.5, 62],
        ],
      }),
    ).toStrictEqual([
      [0, 0.5, 62],
      [1, 0.5, 60],
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
        notes: [[1.5, 2, 60]],
      }),
    ).toStrictEqual([[1.5, 0.5, 60]]);
    expect(
      played({
        start: 0,
        end: 1,
        loopStart: 0,
        loopEnd: 4,
        loopOn: false,
        notes: [[0.5, 2, 60]],
      }),
    ).toStrictEqual([[0.5, 0.5, 60]]);
  });

  it("skips disabled notes and disabled clips", () => {
    const spec: ClipSpec = {
      start: 0,
      end: 4,
      loopStart: 0,
      loopEnd: 4,
      loopOn: false,
      notes: [
        [0, 1, 60, 100, false],
        [1, 1, 62],
      ],
    };
    expect(played(spec)).toStrictEqual([[1, 1, 62]]);
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
        notes: [[0, 1, 60, 99.6]],
      }),
    );
    expect(notes.map((note) => [note.velocity, note.release])).toStrictEqual([[100, 64]]);
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
          [1, 1, 64],
          [0, 1, 67],
          [0, 1, 60],
        ],
      }),
    ).toStrictEqual([
      [0, 1, 60],
      [0, 1, 67],
      [1, 1, 64],
    ]);
  });
});
