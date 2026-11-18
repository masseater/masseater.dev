import type { Bar, Song } from "@r_masseater/fumx-parser";
import { TICKS_PER_WHOLE } from "@r_masseater/fumx-parser";
import { Array as Arr, Option, pipe } from "effect";

const SECONDS_PER_MINUTE = 60;
const QUARTERS_PER_WHOLE = 4;
const TICKS_PER_QUARTER = TICKS_PER_WHOLE / QUARTERS_PER_WHOLE;
const MILLI = 1e-3;
const PAIR = 2;
const NONE = 0;
const ONE = 1;
const STEADY = 1e-9;

interface Span {
  readonly start: number;
  readonly length: number;
  readonly from: number;
  readonly to: number;
}

interface Timed extends Span {
  readonly seconds: number;
}

const secondsAcross =
  ({ length, from, to }: Span) =>
  (ticks: number): number => {
    const quarters = ticks / TICKS_PER_QUARTER;
    if (Math.abs(to - from) < STEADY) {
      return (quarters * SECONDS_PER_MINUTE) / from;
    }
    const slope = (to - from) / (length / TICKS_PER_QUARTER);
    return (SECONDS_PER_MINUTE / slope) * Math.log((from + slope * quarters) / from);
  };

const stepSpans = (bar: Bar): readonly Span[] =>
  pipe(
    bar.tempoSteps,
    Arr.map((step): Span => ({
      start: bar.start + step.offset,
      length: step.length,
      from: step.bpm,
      to: Option.getOrElse(step.target, () => step.bpm),
    })),
  );

const rampedBpm =
  (index: number) =>
  (bar: Bar): Option.Option<number> =>
    pipe(
      bar.tempo.ramp,
      Option.filter((ramp) => bar.index + ramp.bars > index),
      Option.map((ramp) => {
        const share = (index - bar.index) / ramp.bars;
        return bar.tempo.bpm + (ramp.bpm - bar.tempo.bpm) * share;
      }),
    );

const rampedTo =
  (bars: readonly Bar[]) =>
  (index: number): Option.Option<number> =>
    pipe(bars, Arr.take(index + ONE), Arr.reverse, Arr.findFirst(rampedBpm(index)));

const barSpans =
  (bars: readonly Bar[]) =>
  (bar: Bar, index: number): readonly Span[] => {
    if (Arr.isReadonlyArrayNonEmpty(bar.tempoSteps)) {
      return stepSpans(bar);
    }
    const from = Option.getOrElse(rampedTo(bars)(index), () => bar.tempo.bpm);
    const to = Option.getOrElse(rampedTo(bars)(index + ONE), () => from);
    return [{ start: bar.start, length: bar.length, from, to }];
  };

const timedOf = (spans: readonly Span[]): readonly Timed[] =>
  pipe(
    spans,
    Arr.mapAccum(NONE, (seconds, span): readonly [number, Timed] => [
      seconds + secondsAcross(span)(span.length),
      { ...span, seconds },
    ]),
    ([, timed]) => timed,
  );

const swungIn =
  (ticks: number) =>
  ({ grid, amount }: Readonly<{ grid: number; amount: number }>): number => {
    const pair = grid * PAIR;
    const base = Math.floor(ticks / pair) * pair;
    const within = ticks - base;
    const split = pair * amount;
    if (within < grid) {
      return base + within * (split / grid);
    }
    return base + split + (within - grid) * ((pair - split) / grid);
  };

const swungOf =
  (song: Song) =>
  (ticks: number): number =>
    pipe(
      song.groove,
      Option.map(swungIn(ticks)),
      Option.getOrElse(() => ticks),
    );

export interface Clock {
  readonly secondsAt: (ticks: number) => number;
  readonly end: number;
}

const RESTING: Timed = { start: NONE, length: NONE, from: ONE, to: ONE, seconds: NONE };

const plainOf =
  (timed: readonly Timed[]) =>
  (ticks: number): number => {
    const span = pipe(
      timed,
      Arr.findLast((each) => each.start <= ticks),
      Option.getOrElse(() => RESTING),
    );
    return span.seconds + secondsAcross(span)(ticks - span.start);
  };

export const clockOf = (song: Song): Clock => {
  const spans = pipe(song.bars, Arr.flatMap(barSpans(song.bars)));
  const timed = timedOf(spans);
  const last = pipe(
    Arr.last(timed),
    Option.getOrElse(() => RESTING),
  );
  const plain = plainOf(timed);
  const swung = swungOf(song);
  return {
    secondsAt: (ticks) => plain(swung(ticks)),
    end: plain(last.start + last.length),
  };
};

export const nudged =
  (seconds: number) =>
  (milliseconds: number): number =>
    Math.max(NONE, seconds + milliseconds * MILLI);
