import { Array as Arr, Order, pipe } from "effect";

import type { From } from "#/shared/lib/from.ts";

import type { AlsClip } from "./live-set.ts";

const NONE = 0;

export interface PlayedNote {
  readonly beat: number;
  readonly length: number;
  readonly midi: number;
  readonly velocity: number;
  readonly release: number;
}

interface Pass {
  readonly at: number;
  readonly from: number;
  readonly to: number;
}

interface SourceNote {
  readonly time: number;
  readonly end: number;
  readonly midi: number;
  readonly velocity: number;
  readonly release: number;
}

const DEFAULT_RELEASE = 64;

const modulo = (value: number, size: number): number => ((value % size) + size) % size;

const passesOf: From<AlsClip, readonly Pass[]> = (clip) => {
  const start = clip.CurrentStart.Value;
  const length = clip.CurrentEnd.Value - start;
  const loopStart = clip.Loop.LoopStart.Value;
  const loopLength = clip.Loop.LoopEnd.Value - loopStart;
  if (clip.Loop.LoopOn.Value === "false" || loopLength <= NONE) {
    return [{ at: start, from: loopStart, to: loopStart + length }];
  }
  const first = loopStart + modulo(clip.Loop.StartRelative.Value, loopLength);
  const walk = (elapsed: number, from: number, passes: readonly Pass[]): readonly Pass[] => {
    if (elapsed >= length) {
      return passes;
    }
    const span = Math.min(clip.Loop.LoopEnd.Value - from, length - elapsed);
    return walk(elapsed + span, loopStart, [
      ...passes,
      { at: start + elapsed, from, to: from + span },
    ]);
  };
  return walk(NONE, first, []);
};

const sourceNotesOf: From<AlsClip, readonly SourceNote[]> = (clip) =>
  pipe(
    clip.Notes.KeyTracks.KeyTrack ?? [],
    Arr.flatMap((keyTrack) =>
      pipe(
        keyTrack.Notes.MidiNoteEvent ?? [],
        Arr.filter((note) => note.IsEnabled !== "false"),
        Arr.map((note): SourceNote => ({
          time: note.Time,
          end: note.Time + note.Duration,
          midi: keyTrack.MidiKey.Value,
          velocity: Math.round(note.Velocity),
          release:
            note.OffVelocity === undefined || note.OffVelocity === NONE
              ? DEFAULT_RELEASE
              : Math.round(note.OffVelocity),
        })),
      ),
    ),
  );

const inPass =
  (notes: readonly SourceNote[]): From<Pass, readonly PlayedNote[]> =>
  (pass) =>
    pipe(
      notes,
      Arr.filter((note) => note.time >= pass.from && note.time < pass.to),
      Arr.map((note): PlayedNote => ({
        beat: pass.at + note.time - pass.from,
        length: Math.min(note.end, pass.to) - note.time,
        midi: note.midi,
        velocity: note.velocity,
        release: note.release,
      })),
    );

const byStartThenPitch = Order.combine(
  Order.mapInput(Order.Number, (note: PlayedNote) => note.beat),
  Order.mapInput(Order.Number, (note: PlayedNote) => note.midi),
);

export const notesOfClip: From<AlsClip, readonly PlayedNote[]> = (clip) => {
  if (clip.Disabled?.Value === "true") {
    return [];
  }
  const notes = sourceNotesOf(clip);
  return pipe(passesOf(clip), Arr.flatMap(inPass(notes)), Arr.sort(byStartThenPitch));
};
