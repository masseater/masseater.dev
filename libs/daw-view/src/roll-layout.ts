import { Array as Arr, Option, pipe } from "effect";

import { clamp } from "./math.ts";
import type { Span } from "./math.ts";
import type { Note, NoteEvent } from "./song.ts";
import type { Session, Track } from "./tracks.ts";

const TOP = 20;
const LEAST_AREA = 40;
const LEAST_KEYS = 13;
const ROW = { share: 0.42, least: 6, most: 13, alone: 28 } as const;
const GAP = 4;
const NONE = 0;
const ONE = 1;
const HALF = 0.5;
const NARROW = 560;
const KEYBOARD = { narrow: 50, wide: 62 } as const;
const LEAST_SCALE = 8;
const FLAT = 1e-9;

export interface Keys extends Span {
  readonly top: number;
  readonly row: number;
  readonly height: number;
}

export interface RollLayout {
  readonly tracks: readonly Track[];
  readonly single: boolean;
  readonly top: number;
  readonly keys: Option.Option<Keys>;
  readonly rows: readonly string[];
  readonly rowsTop: number;
  readonly rowHeight: number;
}

export interface RollInput {
  readonly session: Session;
  readonly selected: Option.Option<string>;
  readonly height: number;
}

export const keyboardWidth = (width: number): number => {
  if (width < NARROW) {
    return KEYBOARD.narrow;
  }
  return KEYBOARD.wide;
};

export const rollScale = ({ width, bars }: Readonly<{ width: number; bars: number }>): number =>
  Math.max(LEAST_SCALE, (width - keyboardWidth(width)) / bars);

const hasNotes = (track: Track): boolean => track.pitches.low <= track.pitches.high;

const padded = (span: Span): Span => {
  let low = Math.floor(span.low) - ONE;
  let high = Math.ceil(span.high) + ONE;
  while (high - low < LEAST_KEYS) {
    high += ONE;
    if (high - low < LEAST_KEYS) {
      low -= ONE;
    }
  }
  return { low, high };
};

const spanFor =
  (single: boolean) =>
  (track: Track): Span => {
    if (single) {
      return track.reach;
    }
    return track.pitches;
  };

const rangeOf = (tracks: readonly Track[], single: boolean): Option.Option<Span> => {
  const spans = pipe(tracks, Arr.filter(hasNotes), Arr.map(spanFor(single)));
  if (!Arr.isReadonlyArrayNonEmpty(spans)) {
    return Option.none();
  }
  const low = Math.min(
    ...pipe(
      spans,
      Arr.map((span) => span.low),
    ),
  );
  const high = Math.max(
    ...pipe(
      spans,
      Arr.map((span) => span.high),
    ),
  );
  return Option.some(padded({ low, high }));
};

const rowsOf = (tracks: readonly Track[], single: boolean): readonly string[] => {
  if (single) {
    return pipe(
      tracks,
      Arr.flatMap((track) => track.rows),
    );
  }
  return pipe(
    tracks,
    Arr.filter((track) => Arr.isReadonlyArrayNonEmpty(track.rows)),
    Arr.map((track) => track.name),
  );
};

const rowHeightOf = (area: number, count: number, keyed: boolean): number => {
  if (count === NONE) {
    return NONE;
  }
  if (keyed) {
    return clamp({ low: ROW.least, high: ROW.most })((area * ROW.share) / count);
  }
  return Math.min(ROW.alone, area / count);
};

const gapUnder = (rowsHeight: number): number => {
  if (rowsHeight > NONE) {
    return GAP;
  }
  return NONE;
};

const chosen = ({ session, selected }: RollInput): readonly Track[] =>
  pipe(
    selected,
    Option.flatMap((name) =>
      pipe(
        session.tracks,
        Arr.findFirst((track) => track.name === name),
      ),
    ),
    Option.match({ onNone: () => session.tracks, onSome: (track) => [track] }),
  );

const keysOf = (range: Option.Option<Span>, room: number): Option.Option<Keys> =>
  pipe(
    range,
    Option.map((span) => ({
      ...span,
      top: TOP,
      height: room,
      row: room / (span.high - span.low + ONE),
    })),
  );

export const layoutOf = (input: RollInput): RollLayout => {
  const tracks = chosen(input);
  const single = Option.isSome(input.selected) && tracks.length === ONE;
  const range = rangeOf(tracks, single);
  const rows = rowsOf(tracks, single);
  const area = Math.max(LEAST_AREA, input.height - TOP);
  const rowHeight = rowHeightOf(area, rows.length, Option.isSome(range));
  const rowsHeight = Math.round(rowHeight * rows.length);
  const keys = keysOf(range, area - rowsHeight - gapUnder(rowsHeight));
  const rowsTop =
    TOP +
    Option.match(keys, {
      onNone: () => NONE,
      onSome: (found) => found.height + gapUnder(rowsHeight),
    });
  return { tracks, single, top: TOP, keys, rows, rowsTop, rowHeight };
};

export const centerOf =
  (keys: Keys) =>
  (pitch: number): number =>
    keys.top + (keys.high + HALF - pitch) * keys.row;

const between = (note: Note, index: number, elapsed: number): Option.Option<number> =>
  pipe(
    Option.all([Arr.get(note.glide, index - ONE), Arr.get(note.glide, index)]),
    Option.filter(([, next]) => elapsed < next.at),
    Option.map(
      ([last, next]) =>
        last.semitones +
        ((next.semitones - last.semitones) * (elapsed - last.at)) / (next.at - last.at || FLAT),
    ),
  );

const sweep = (note: Note, elapsed: number): number => {
  for (const index of Arr.range(ONE, Math.max(ONE, note.glide.length - ONE))) {
    const bend = between(note, index, elapsed);
    if (Option.isSome(bend)) {
      return bend.value;
    }
  }
  return pipe(
    Arr.last(note.glide),
    Option.match({ onNone: () => NONE, onSome: (point) => point.semitones }),
  );
};

export const glideAt =
  (note: Note) =>
  (elapsed: number): number => {
    const first = Arr.head(note.glide);
    if (Option.isSome(first) && elapsed <= first.value.at) {
      return first.value.semitones;
    }
    return sweep(note, elapsed);
  };

export const glides = (note: Note): boolean =>
  pipe(
    note.glide,
    Arr.some((point) => point.semitones !== NONE),
  );

export const rowIndex =
  (layout: RollLayout) =>
  (event: NoteEvent): Option.Option<number> => {
    if (layout.single) {
      return pipe(
        layout.rows,
        Arr.findFirstIndex((name) => name === event.sample),
      );
    }
    return pipe(
      layout.rows,
      Arr.findFirstIndex((name) => name === event.track),
    );
  };

export const isKeyed =
  (layout: RollLayout) =>
  (event: NoteEvent): event is Note =>
    event.kind === "note" && Option.isSome(layout.keys);
