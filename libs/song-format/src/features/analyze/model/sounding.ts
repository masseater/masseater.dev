import { Array as Arr, Option, pipe } from "effect";
import { Note as TonalNote } from "tonal";

import type { Role, Song } from "#/entities/song/index.ts";
import { fractionOf } from "#/shared/lib/ticks.ts";

const NONE = 0;
const FIRST = 1;

export interface Span {
  readonly start: number;
  readonly end: number;
}

export interface Sounding extends Span {
  readonly track: string;
  readonly role: Option.Option<Role>;
  readonly midi: number;
  readonly pitchClass: string;
}

export const overlapOf =
  (left: Span) =>
  (right: Span): number =>
    Math.max(NONE, Math.min(left.end, right.end) - Math.max(left.start, right.start));

export const soundingsOf = (song: Song): readonly Sounding[] =>
  pipe(
    song.notes,
    Arr.map((note) => ({
      track: note.track,
      role: pipe(
        song.tracks,
        Arr.findFirst((track) => track.name === note.track),
        Option.flatMap((track) => track.role),
      ),
      midi: note.midi,
      pitchClass: TonalNote.pitchClass(TonalNote.fromMidi(note.midi)),
      start: note.start,
      end: note.start + note.length,
    })),
  );

export const positionOf =
  (song: Song) =>
  (tick: number): { readonly bar: number; readonly offset: string } =>
    pipe(
      song.bars,
      Arr.findLast((bar) => bar.start <= tick),
      Option.match({
        onNone: () => ({ bar: FIRST, offset: fractionOf(tick) }),
        onSome: (bar) => ({ bar: bar.index, offset: fractionOf(tick - bar.start) }),
      }),
    );
