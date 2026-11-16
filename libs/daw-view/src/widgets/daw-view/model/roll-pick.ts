import { Array as Arr, Option, pipe } from "effect";

import type { Note, NoteEvent } from "#/entities/song/index.ts";
import { eventsBetween } from "#/entities/song/index.ts";

import { centerOf, glideAt, isKeyed, rowIndex } from "./roll-layout.ts";
import type { Keys, RollLayout } from "./roll-layout.ts";

const REACH = 3;
const HALF = 2;

export interface Sounding {
  readonly keys: readonly number[];
  readonly rows: readonly number[];
}

export interface Point {
  readonly left: number;
  readonly top: number;
}

export interface Aim extends Point {
  readonly seconds: number;
}

const under =
  (seconds: number) =>
  (layout: RollLayout): readonly NoteEvent[] =>
    pipe(layout.tracks, Arr.flatMap(eventsBetween({ from: seconds, to: seconds })));

const keyOf =
  (seconds: number) =>
  (note: Note): number =>
    Math.round(note.pitch + glideAt(note)(seconds - note.start));

export const soundingAt =
  (layout: RollLayout) =>
  (seconds: number): Sounding => {
    const events = pipe(
      layout,
      under(seconds),
      Arr.filter((event) => seconds < event.start + event.duration),
    );
    return {
      keys: pipe(events, Arr.filter(isKeyed(layout)), Arr.map(keyOf(seconds))),
      rows: pipe(
        events,
        Arr.filter((event) => !isKeyed(layout)(event)),
        Arr.flatMap((event) => Option.toArray(rowIndex(layout)(event))),
      ),
    };
  };

const onKey = (keys: Keys, note: Note, aim: Aim): boolean => {
  const pitch = note.pitch + glideAt(note)(aim.seconds - note.start);
  return Math.abs(aim.top - centerOf(keys)(pitch)) <= Math.max(REACH, keys.row / HALF);
};

const onRow = (layout: RollLayout, event: NoteEvent, aim: Aim): boolean =>
  pipe(
    rowIndex(layout)(event),
    Option.map((index) => layout.rowsTop + index * layout.rowHeight),
    Option.exists((top) => aim.top >= top && aim.top < top + layout.rowHeight),
  );

const touches =
  (layout: RollLayout, aim: Aim) =>
  (event: NoteEvent): boolean => {
    if (isKeyed(layout)(event) && Option.isSome(layout.keys)) {
      return onKey(layout.keys.value, event, aim);
    }
    return onRow(layout, event, aim);
  };

export const pickAt =
  (layout: RollLayout) =>
  (aim: Aim): Option.Option<NoteEvent> =>
    pipe(
      layout,
      under(aim.seconds),
      Arr.filter((event) => aim.seconds <= event.start + event.duration),
      Arr.filter(touches(layout, aim)),
      Arr.last,
    );
