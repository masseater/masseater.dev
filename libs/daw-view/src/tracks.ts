import { Array as Arr, Option, Order, Record as Rec, pipe } from "effect";

import { barsOf, clipsOf, sampleCounts } from "./clips.ts";
import type { Bars, Clip, SampleCount } from "./clips.ts";
import { nameHue } from "./color.ts";
import { clamp } from "./math.ts";
import type { Span } from "./math.ts";
import type { Automation, Note, NoteEvent, Structure, Take, TrackStyle } from "./song.ts";

const NONE = 0;
const ONE = 1;
const HALF = 2;
const SILENT = 1e-9;
const LANE_HEIGHT = 26;
const NOTE_TRACK = { base: 14, perSemitone: 1.15, least: 34, most: 52 } as const;
const HIT_TRACK = { base: 12, perRow: 2.6, least: 24, most: 68 } as const;

export const RULER_HEIGHT = 46;

export interface Track extends TrackStyle {
  readonly events: readonly NoteEvent[];
  readonly longest: number;
  readonly loudest: number;
  readonly pitches: Span;
  readonly reach: Span;
  readonly pitched: boolean;
  readonly rows: readonly string[];
  readonly samples: readonly SampleCount[];
  readonly clips: readonly Clip[];
  readonly top: number;
  readonly height: number;
}

export interface Lane {
  readonly automation: Automation;
  readonly top: number;
  readonly height: number;
}

export interface Session {
  readonly tracks: readonly Track[];
  readonly lanes: readonly Lane[];
  readonly height: number;
  readonly roots: readonly number[];
}

const isNote = (event: NoteEvent): event is Note => event.kind === "note";

const byStart = Order.mapInput(Order.Number, (event: NoteEvent) => event.start);

const spanOf = (values: readonly number[]): Span => ({
  low: Math.min(Number.POSITIVE_INFINITY, ...values),
  high: Math.max(Number.NEGATIVE_INFINITY, ...values),
});

const reachOf = (note: Note): readonly number[] => [
  note.pitch,
  ...pipe(
    note.glide,
    Arr.map((point) => note.pitch + point.semitones),
  ),
];

const noteHeight = (pitches: Span): number =>
  pipe(
    NOTE_TRACK.base + (pitches.high - pitches.low) * NOTE_TRACK.perSemitone,
    clamp({ low: NOTE_TRACK.least, high: NOTE_TRACK.most }),
    Math.round,
  );

const hitHeight = (rows: number): number =>
  pipe(
    HIT_TRACK.base + rows * HIT_TRACK.perRow,
    clamp({ low: HIT_TRACK.least, high: HIT_TRACK.most }),
    Math.round,
  );

const heightOf = (track: Pick<Track, "pitched" | "pitches" | "rows">): number => {
  if (track.pitched) {
    return noteHeight(track.pitches);
  }
  return hitHeight(track.rows.length);
};

const styleOf = (name: string, styles: readonly TrackStyle[]): TrackStyle =>
  pipe(
    styles,
    Arr.findFirst((style) => style.name === name),
    Option.getOrElse((): TrackStyle => ({ name, hue: nameHue(name), tone: "full" })),
  );

const shapeOf = (
  events: readonly NoteEvent[],
): Pick<Track, "pitched" | "pitches" | "reach" | "rows"> => {
  const notes = pipe(events, Arr.filter(isNote));
  return {
    pitched: notes.length * HALF >= events.length,
    pitches: spanOf(
      pipe(
        notes,
        Arr.map((note) => note.pitch),
      ),
    ),
    reach: spanOf(pipe(notes, Arr.flatMap(reachOf))),
    rows: pipe(
      events,
      Arr.filter((event) => !isNote(event)),
      Arr.map((event) => event.sample),
      Arr.dedupe,
    ),
  };
};

const trackOf =
  (structure: Structure, bars: Bars) =>
  ([name, unsorted]: readonly [string, readonly NoteEvent[]]): Track => {
    const events = Arr.sort(unsorted, byStart);
    const shape = shapeOf(events);
    return {
      ...styleOf(name, structure.tracks),
      ...shape,
      events,
      longest: Math.max(
        NONE,
        ...pipe(
          events,
          Arr.map((event) => event.duration),
        ),
      ),
      loudest: Math.max(
        SILENT,
        ...pipe(
          events,
          Arr.map((event) => event.gain),
        ),
      ),
      samples: sampleCounts(events),
      clips: clipsOf(bars)(events),
      top: NONE,
      height: heightOf(shape),
    };
  };

const rankIn =
  (styles: readonly TrackStyle[]) =>
  (track: Track): number =>
    pipe(
      styles,
      Arr.findFirstIndex((style) => style.name === track.name),
      Option.getOrElse(() => styles.length),
    );

const stacked = <Row extends { readonly height: number; readonly top: number }>(
  rows: readonly Row[],
  top: number,
): readonly [number, readonly Row[]] =>
  pipe(
    rows,
    Arr.mapAccum(top, (offset, row) => [offset + row.height, { ...row, top: offset }]),
  );

const tracksOf = (structure: Structure, take: Take): readonly Track[] => {
  const toTrack = trackOf(structure, barsOf(structure));
  const tracks = pipe(
    take.events,
    Arr.groupBy((event) => event.track),
    Rec.toEntries,
    Arr.map(toTrack),
  );
  const byRank = Order.mapInput(Order.Number, rankIn(structure.tracks));
  return Arr.sort(tracks, byRank);
};

export const sessionOf =
  (structure: Structure) =>
  (take: Take): Session => {
    const [bottom, tracks] = stacked(tracksOf(structure, take), RULER_HEIGHT);
    const lanes = pipe(
      take.automation,
      Arr.map((automation) => ({ automation, height: LANE_HEIGHT, top: NONE })),
    );
    const [height, placed] = stacked(lanes, bottom);
    return { tracks, lanes: placed, height, roots: take.roots };
  };

const startOf = (events: readonly NoteEvent[], index: number): number =>
  pipe(
    Arr.get(events, index),
    Option.match({ onNone: () => Number.POSITIVE_INFINITY, onSome: (event) => event.start }),
  );

export const firstFrom =
  (seconds: number) =>
  (events: readonly NoteEvent[]): number => {
    let low = NONE;
    let high = events.length;
    while (low < high) {
      const middle = Math.floor((low + high) / HALF);
      if (startOf(events, middle) < seconds) {
        low = middle + ONE;
      } else {
        high = middle;
      }
    }
    return low;
  };

export interface Window {
  readonly from: number;
  readonly to: number;
}

export const eventsBetween =
  ({ from, to }: Window) =>
  (track: Pick<Track, "events" | "longest">): readonly NoteEvent[] => {
    const first = firstFrom(from - track.longest)(track.events);
    const end = firstFrom(to + SILENT)(track.events);
    return pipe(track.events, Arr.drop(first), Arr.take(Math.max(NONE, end - first)));
  };
