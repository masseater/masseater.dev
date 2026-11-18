import { Array as Arr, Number as Num, Order, pipe } from "effect";

export type Interval = Readonly<{ start: number; end: number }>;

const byStart = Order.mapInput(Num.Order, (interval: Interval) => interval.start);

const joined = (last: Interval, next: Interval): Interval => ({
  start: last.start,
  end: Math.max(last.end, next.end),
});

const mergeSorted = (merged: readonly Interval[], rest: readonly Interval[]): readonly Interval[] =>
  Arr.match(rest, {
    onEmpty: () => merged,
    onNonEmpty: ([next, ...others]) =>
      Arr.matchRight(merged, {
        onEmpty: () => mergeSorted([next], others),
        onNonEmpty: (init, last) => {
          if (next.start > last.end) {
            return mergeSorted([...merged, next], others);
          }
          return mergeSorted([...init, joined(last, next)], others);
        },
      }),
  });

export const coveredMillis = (intervals: readonly Interval[]): number =>
  pipe(
    mergeSorted([], Arr.sort(intervals, byStart)),
    Arr.map((interval) => interval.end - interval.start),
    Num.sumAll,
  );
