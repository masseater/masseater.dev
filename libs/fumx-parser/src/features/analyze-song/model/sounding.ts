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
  readonly line: number;
  readonly column: number;
  readonly bar: number;
  readonly role: Option.Option<Role>;
  readonly midi: number;
  readonly spelling: string;
  readonly pitchClass: string;
}

export const overlapOf =
  (left: Span) =>
  (right: Span): number =>
    Math.max(NONE, Math.min(left.end, right.end) - Math.max(left.start, right.start));

export const soundingsOf = (song: Song): readonly Sounding[] => {
  const audible = pipe(
    song.tracks,
    Arr.filter((track) => !track.mixer.muted),
  );
  return pipe(
    song.notes,
    Arr.flatMap((note) =>
      pipe(
        audible,
        Arr.findFirst((track) => track.name === note.track),
        Option.map((track) => ({
          track: note.track,
          line: note.sourceLine,
          column: note.sourceColumn,
          bar: note.bar,
          role: track.role,
          midi: note.midi,
          spelling: note.spelling,
          pitchClass: TonalNote.pitchClass(TonalNote.fromMidi(note.midi)),
          start: note.start,
          end: note.start + Math.round(note.length * note.gate),
        })),
        Option.toArray,
      ),
    ),
  );
};

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
