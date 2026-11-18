import { Array as Arr, Number as Num, Option, pipe } from "effect";

const PERCENT = 100;
const FIRST = 0;
const NOTHING = 0;
const ONE = 1;

export const MEDIAN = 50;
export const TAIL = 90;
export const MAXIMUM = PERCENT;

export const percentile =
  (rank: number) =>
  (values: readonly number[]): Option.Option<number> => {
    const sorted = Arr.sort(values, Num.Order);
    const index = Math.ceil((rank / PERCENT) * sorted.length) - ONE;
    return Arr.get(sorted, Math.max(index, FIRST));
  };

export const shareOf =
  (whole: number) =>
  (part: number): number =>
    pipe(
      Option.liftPredicate(whole, (value) => value > NOTHING),
      Option.match({ onNone: () => NOTHING, onSome: (value) => (part / value) * PERCENT }),
    );
