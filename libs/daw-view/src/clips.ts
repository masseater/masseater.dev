import { Array as Arr, Option, Order, Record as Rec, pipe } from "effect";

import { clamp } from "./math.ts";
import { barSeconds, totalBars } from "./song.ts";
import type { NoteEvent, Structure } from "./song.ts";

const NONE = 0;
const ONE = 1;
const EDGE = 0.004;

export interface SampleCount {
  readonly name: string;
  readonly count: number;
}

export interface Clip {
  readonly from: number;
  readonly to: number;
  readonly name: string;
}

export interface Bars {
  readonly seconds: number;
  readonly count: number;
  readonly bounds: readonly number[];
}

interface Run {
  readonly from: number;
  readonly to: number;
}

const byCount = Order.flip(Order.mapInput(Order.Number, (sample: SampleCount) => sample.count));

export const sampleCounts = (events: readonly NoteEvent[]): readonly SampleCount[] =>
  pipe(
    events,
    Arr.groupBy((event) => event.sample),
    Rec.toEntries,
    Arr.map(([name, group]) => ({ name, count: group.length })),
    Arr.sortBy(byCount),
  );

const barAt = (seconds: number, bars: Bars): number =>
  clamp({ low: NONE, high: bars.count - ONE })(Math.floor(seconds / bars.seconds));

const barsUnder =
  (bars: Bars) =>
  (event: NoteEvent): readonly number[] => {
    const from = barAt(event.start + EDGE, bars);
    const to = Math.max(from, barAt(event.start + event.duration - EDGE, bars));
    return Arr.range(from, to);
  };

const extended = (runs: readonly Run[], bar: number, bars: Bars): readonly Run[] => {
  const last = Arr.last(runs);
  if (Option.isSome(last) && last.value.to === bar && !Arr.contains(bars.bounds, bar)) {
    return [...Arr.dropRight(runs, ONE), { from: last.value.from, to: bar + ONE }];
  }
  return [...runs, { from: bar, to: bar + ONE }];
};

const runsOf = (events: readonly NoteEvent[], bars: Bars): readonly Run[] => {
  const occupied = pipe(events, Arr.flatMap(barsUnder(bars)), Arr.dedupe);
  let runs: readonly Run[] = [];
  for (const bar of Arr.sort(occupied, Order.Number)) {
    runs = extended(runs, bar, bars);
  }
  return runs;
};

const startsIn =
  (run: Run, bars: Bars) =>
  (event: NoteEvent): boolean => {
    const bar = barAt(event.start + EDGE, bars);
    return bar >= run.from && bar < run.to;
  };

const dominant = (events: readonly NoteEvent[]): string =>
  pipe(
    sampleCounts(events),
    Arr.head,
    Option.match({ onNone: () => "", onSome: (sample) => sample.name }),
  );

const clipOf =
  (events: readonly NoteEvent[], bars: Bars) =>
  (run: Run): Clip => {
    const inside = pipe(events, Arr.filter(startsIn(run, bars)));
    return { ...run, name: dominant(inside) };
  };

export const clipsOf =
  (bars: Bars) =>
  (events: readonly NoteEvent[]): readonly Clip[] =>
    pipe(runsOf(events, bars), Arr.map(clipOf(events, bars)));

export const barsOf = (structure: Structure): Bars => ({
  seconds: barSeconds(structure),
  count: Math.ceil(totalBars(structure)) + ONE,
  bounds: [
    ...pipe(
      structure.sections,
      Arr.flatMap((section) => [section.from, section.to]),
    ),
    ...pipe(
      structure.marks,
      Arr.map((mark) => mark.bar),
    ),
  ],
});
