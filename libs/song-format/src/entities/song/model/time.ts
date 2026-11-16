import { Array as Arr, Option, Order, pipe } from "effect";

import { TICKS_PER_BEAT } from "./song.ts";
import type { MeterChange, Position, Song } from "./song.ts";

const FIRST = 1;
const NONE = 0;

export interface Span {
  readonly start: number;
  readonly end: number;
}

export interface Timeline {
  readonly barStart: (bar: number) => number;
  readonly barOf: (tick: number) => number;
  readonly tickOf: (position: Position) => number;
  readonly positionOf: (tick: number) => Position;
  readonly beatsIn: (bar: number) => number;
}

interface Segment {
  readonly bar: number;
  readonly start: number;
  readonly barTicks: number;
  readonly beats: number;
}

const byBar = Order.mapInput(Order.Number, (change: MeterChange) => change.bar);

const addSegment = (segments: readonly Segment[], change: MeterChange): readonly Segment[] => {
  const segment = {
    bar: change.bar,
    beats: change.numerator,
    barTicks: change.numerator * TICKS_PER_BEAT,
  };
  return Option.match(Arr.last(segments), {
    onNone: () => [{ ...segment, bar: FIRST, start: NONE }],
    onSome: (last) => [
      ...segments,
      { ...segment, start: last.start + (change.bar - last.bar) * last.barTicks },
    ],
  });
};

const segmentsOf = (meter: readonly MeterChange[]): readonly Segment[] => {
  const ordered = pipe(
    Arr.sort(meter, byBar),
    Arr.dedupeWith((left, right) => left.bar === right.bar),
  );
  return Arr.reduce(ordered, [] as readonly Segment[], addSegment);
};

const FALLBACK: Segment = { bar: FIRST, start: NONE, beats: FIRST, barTicks: TICKS_PER_BEAT };

const segmentFor = (
  segments: readonly Segment[],
  reached: (segment: Segment) => boolean,
): Segment =>
  pipe(
    segments,
    Arr.filter(reached),
    Arr.last,
    Option.orElse(() => Arr.head(segments)),
    Option.getOrElse(() => FALLBACK),
  );

export const timelineOf = (song: Song): Timeline => {
  const segments = segmentsOf(song.meter);
  const atBar = (bar: number): Segment => segmentFor(segments, (segment) => segment.bar <= bar);
  const atTick = (tick: number): Segment =>
    segmentFor(segments, (segment) => segment.start <= tick);
  const barStart = (bar: number): number => {
    const segment = atBar(bar);
    return segment.start + (bar - segment.bar) * segment.barTicks;
  };
  const barOf = (tick: number): number => {
    const segment = atTick(tick);
    return segment.bar + Math.floor((tick - segment.start) / segment.barTicks);
  };
  const tickOf = ({ bar, beat, tick }: Position): number =>
    barStart(bar) + (beat - FIRST) * TICKS_PER_BEAT + tick;
  const positionOf = (tick: number): Position => {
    const bar = barOf(tick);
    const inBar = tick - barStart(bar);
    return {
      bar,
      beat: Math.floor(inBar / TICKS_PER_BEAT) + FIRST,
      tick: inBar % TICKS_PER_BEAT,
    };
  };
  const beatsIn = (bar: number): number => atBar(bar).beats;
  return { barStart, barOf, tickOf, positionOf, beatsIn };
};

export const overlapOf =
  (left: Span) =>
  (right: Span): number =>
    Math.max(NONE, Math.min(left.end, right.end) - Math.max(left.start, right.start));
