import type { Analysis, Song } from "@masseater.dev/yogoto-protocol";
import { Array as Arr, Number as Num, Option, Order, pipe, Record, String as Str } from "effect";

export type Facts = Readonly<{ bpm: string; key: string; meter: string }>;

type Tally = readonly [string, number];

const SECONDS_PER_MINUTE = 60;

const BEAT_UNIT = 4;

const HALF = 2;

const NEXT = 1;

const NO_GAP = 0;

const ONE_BAR = 1;

const median = (values: readonly number[]): Option.Option<number> => {
  const sorted = Arr.sort(values, Order.Number);
  return Arr.get(sorted, Math.floor(sorted.length / HALF));
};

const gapsOf = (beats: readonly number[]): readonly number[] =>
  pipe(
    Arr.zip(beats, Arr.drop(beats, NEXT)),
    Arr.map(([from, to]) => to - from),
    Arr.filter(Num.isGreaterThan(NO_GAP)),
  );

const bpmOf = (analysis: Analysis): Option.Option<string> =>
  pipe(
    median(gapsOf(analysis.beats)),
    Option.map((gap) => String(Math.round(SECONDS_PER_MINUTE / gap))),
  );

const shortKey = (key: string): string =>
  pipe(key, Str.replace(" major", ""), Str.replace(" minor", "m"));

const mostOf =
  <Item>(name: (item: Item) => string, weight: (item: Item) => number) =>
  (items: readonly Item[]): Option.Option<string> =>
    pipe(
      Arr.groupBy(items, name),
      Record.toEntries,
      Arr.map(([label, group]): Tally => [label, pipe(group, Arr.map(weight), Num.sumAll)]),
      Arr.sortWith(([, count]: Tally) => -count, Order.Number),
      Arr.head,
      Option.map(([label]) => label),
    );

const keyOf = (analysis: Analysis): Option.Option<string> =>
  pipe(
    analysis.keys,
    mostOf(
      (span) => span.key,
      (span) => span.bars,
    ),
    Option.map(shortKey),
  );

const meterOf = (analysis: Analysis): Option.Option<string> =>
  pipe(
    analysis.bars,
    mostOf(
      (bar) => String(bar.beats),
      () => ONE_BAR,
    ),
    Option.map((beats) => `${beats}/${String(BEAT_UNIT)}`),
  );

export const factsOf = (song: Song): Option.Option<Facts> =>
  pipe(
    Option.fromNullOr(song.analysis),
    Option.flatMap((analysis) =>
      Option.all({ bpm: bpmOf(analysis), key: keyOf(analysis), meter: meterOf(analysis) }),
    ),
  );
