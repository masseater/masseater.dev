import { Array as Arr, Number as Num, Option, String as Str, pipe } from "effect";

const SPAN = 60;

const YEAR_END = 4;

const MONTH_START = 5;

const MONTH_END = 7;

const MONTHS_PER_YEAR = 12;

const PAD = 2;

const FIRST = 1;

const YEAR_START = 0;

const numberAt = ({
  end,
  start,
  text,
}: Readonly<{ end: number; start: number; text: string }>): number =>
  pipe(
    Str.slice(start, end)(text),
    Num.parse,
    Option.getOrElse(() => FIRST),
  );

const monthText = (index: number): string => {
  const year = Math.floor(index / MONTHS_PER_YEAR);
  const month = (index % MONTHS_PER_YEAR) + FIRST;
  return `${String(year)}-${Str.padStart(PAD, "0")(String(month))}`;
};

export const recentMonths = (asOf: string): readonly string[] => {
  const latest =
    numberAt({ text: asOf, start: YEAR_START, end: YEAR_END }) * MONTHS_PER_YEAR +
    numberAt({ text: asOf, start: MONTH_START, end: MONTH_END }) -
    FIRST;
  return pipe(Arr.range(latest - SPAN + FIRST, latest), Arr.reverse, Arr.map(monthText));
};
