import { TICKS_PER_WHOLE, fractionOf } from "@r_masseater/fumx-parser";
import { Array as Arr, Option, pipe } from "effect";

import type { From } from "#/shared/lib/from.ts";

import type { Meter, TempoChange, Text, Timeline } from "./events.ts";

const NONE = 0;
const NEXT = 1;
const QUARTER = 4;
const DEFAULT_METER = { numerator: QUARTER, denominator: QUARTER };
const DEFAULT_MICROSECONDS = 500_000;
const MICROSECONDS_PER_MINUTE = 60_000_000;
const MAX_DECIMALS = 9;

export interface LaidTempo {
  readonly offset: number;
  readonly length: number;
  readonly microseconds: number;
}

export interface Span {
  readonly start: number;
  readonly length: number;
}

export interface LaidBar extends Span {
  readonly meter: string;
  readonly tempo: readonly LaidTempo[];
  readonly marks: readonly string[];
}

interface Signature {
  readonly numerator: number;
  readonly denominator: number;
}

export const endOfSpan: From<Span, number> = (span) => span.start + span.length;

const latestAt =
  (tick: number) =>
  <Item extends { readonly tick: number }>(items: readonly Item[]): Option.Option<Item> =>
    pipe(
      items,
      Arr.filter((item) => item.tick <= tick),
      Arr.last,
    );

const lengthOf: From<Signature, number> = (signature) =>
  (TICKS_PER_WHOLE * signature.numerator) / signature.denominator;

const meterText =
  (signature: Signature): From<number, string> =>
  (length) => {
    const beats = (length * signature.denominator) / TICKS_PER_WHOLE;
    if (Number.isInteger(beats)) {
      return `${String(beats)}/${String(signature.denominator)}`;
    }
    return fractionOf(length);
  };

const tempoAt =
  (tempos: readonly TempoChange[]): From<number, number> =>
  (tick) =>
    pipe(
      latestAt(tick)(tempos),
      Option.match({ onNone: () => DEFAULT_MICROSECONDS, onSome: (tempo) => tempo.microseconds }),
    );

const tempoStepsOf =
  (tempos: readonly TempoChange[]): From<Span, readonly LaidTempo[]> =>
  (bar) => {
    const end = endOfSpan(bar);
    const points = [
      bar.start,
      ...pipe(
        tempos,
        Arr.filter((tempo) => tempo.tick > bar.start && tempo.tick < end),
        Arr.map((tempo) => tempo.tick),
        Arr.dedupe,
      ),
    ];
    return pipe(
      points,
      Arr.map((tick, index) => ({
        offset: tick - bar.start,
        length: Option.getOrElse(Arr.get(points, index + NEXT), () => end) - tick,
        microseconds: tempoAt(tempos)(tick),
      })),
    );
  };

const marksOf =
  (markers: readonly Text[]): From<Span, readonly string[]> =>
  (bar) =>
    pipe(
      markers,
      Arr.filter((marker) => marker.tick >= bar.start && marker.tick < endOfSpan(bar)),
      Arr.map((marker) => marker.text),
    );

const spanAt =
  (meters: readonly Meter[]): From<number, Span & { readonly signature: Signature }> =>
  (start) => {
    const signature = Option.getOrElse(latestAt(start)(meters), () => DEFAULT_METER);
    const full = start + lengthOf(signature);
    const end = pipe(
      Arr.findFirst(meters, (meter) => meter.tick > start),
      Option.match({ onNone: () => full, onSome: (meter) => Math.min(meter.tick, full) }),
    );
    return { start, length: end - start, signature };
  };

export const barsOf: From<Timeline, readonly LaidBar[]> = (timeline) =>
  Arr.unfold({ start: NONE, first: true }, (cursor) => {
    if (!cursor.first && cursor.start >= timeline.end) {
      return Option.none();
    }
    const span = spanAt(timeline.meters)(cursor.start);
    const bar: LaidBar = {
      start: span.start,
      length: span.length,
      meter: meterText(span.signature)(span.length),
      tempo: tempoStepsOf(timeline.tempos)(span),
      marks: marksOf(timeline.markers)(span),
    };
    return Option.some([bar, { start: endOfSpan(span), first: false }] as const);
  });

export const bpmText: From<number, string> = (microseconds) => {
  const exact = MICROSECONDS_PER_MINUTE / microseconds;
  const text = pipe(
    Arr.range(NONE, MAX_DECIMALS),
    Arr.map((decimals) => String(Number(exact.toFixed(decimals)))),
    Arr.findFirst(
      (candidate) => Math.round(MICROSECONDS_PER_MINUTE / Number(candidate)) === microseconds,
    ),
    Option.getOrElse(() => String(exact)),
  );
  return `${text}bpm`;
};
