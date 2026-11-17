import { Array as Arr, Option, Order, Record as Rec, pipe } from "effect";

import type { From } from "#/shared/lib/from.ts";

import type { Part, TimelineNote } from "./events.ts";
import { DRUM_CHANNEL } from "./general-midi.ts";

const NONE = 0;
const NEXT = 1;

export const isDrumPart: From<Part, boolean> = (part) => part.channel === DRUM_CHANNEL;

export interface Group {
  readonly start: number;
  readonly end: number;
  readonly midis: readonly number[];
  readonly velocity: number;
  readonly release: number;
  readonly lyric: Option.Option<string>;
}

export type Line = readonly Group[];

const chordKeyOf: From<TimelineNote, string> = (note) =>
  `${String(note.tick)}:${String(note.end)}:${String(note.velocity)}:${String(note.release)}`;

const groupOf: From<readonly TimelineNote[], Option.Option<Group>> = (notes) =>
  pipe(
    Arr.head(notes),
    Option.map((first) => ({
      start: first.tick,
      end: first.end,
      midis: pipe(
        notes,
        Arr.map((note) => note.midi),
      ),
      velocity: first.velocity,
      release: first.release,
      lyric: Option.none(),
    })),
  );

const stackedOf: From<readonly TimelineNote[], readonly (readonly TimelineNote[])[]> = (chord) =>
  pipe(
    chord,
    Arr.map((note, index) => ({
      note,
      layer: pipe(
        Arr.take(chord, index),
        Arr.countBy((earlier) => earlier.midi === note.midi),
      ),
    })),
    Arr.groupBy(({ layer }) => String(layer)),
    Rec.values,
    Arr.map((layer) =>
      pipe(
        layer,
        Arr.map(({ note }) => note),
      ),
    ),
  );

const chordsOf: From<Part, readonly (readonly TimelineNote[])[]> = (part) => {
  if (isDrumPart(part)) {
    return pipe(
      part.notes,
      Arr.map((note) => [note]),
    );
  }
  return pipe(part.notes, Arr.groupBy(chordKeyOf), Rec.values, Arr.flatMap(stackedOf));
};

const byStartThenLonger = Order.combine(
  Order.mapInput(Order.Number, (group: Group) => group.start),
  Order.mapInput(Order.flip(Order.Number), (group: Group) => group.end),
);

const withLyrics =
  (part: Part): From<readonly Group[], readonly Group[]> =>
  (groups) =>
    pipe(
      groups,
      Arr.map((group, index) => {
        const leads = pipe(
          Arr.get(groups, index - NEXT),
          Option.match({
            onNone: () => true,
            onSome: (previous) => previous.start !== group.start,
          }),
        );
        const lyric = pipe(
          Arr.findFirst(part.lyrics, (candidate) => candidate.tick === group.start),
          Option.filter(() => leads),
          Option.map((found) => found.text),
        );
        return { ...group, lyric };
      }),
    );

export const groupsOf: From<Part, readonly Group[]> = (part) => {
  const groups = pipe(chordsOf(part), Arr.map(groupOf), Arr.getSomes);
  return withLyrics(part)(Arr.sort(groups, byStartThenLonger));
};

const endOfLine: From<Line, number> = (line) =>
  Option.match(Arr.last(line), { onNone: () => NONE, onSome: (group) => group.end });

const placeGroup = (lines: readonly Line[], group: Group): readonly Line[] =>
  Option.match(
    Arr.findFirstIndex(lines, (line) => endOfLine(line) <= group.start),
    {
      onNone: () => [...lines, [group]],
      onSome: (index) =>
        pipe(
          lines,
          Arr.map((line, position): Line => {
            if (position === index) {
              return [...line, group];
            }
            return line;
          }),
        ),
    },
  );

export const linesOf: From<readonly Group[], readonly Line[]> = (groups) =>
  Arr.reduce(groups, [] as readonly Line[], placeGroup);
