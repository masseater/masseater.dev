import { Array as Arr, Option, pipe } from "effect";

import { previousWeekStart, weekStart } from "./week";

const NONE = 0;

export type BoundedCount = Readonly<{ count: number; exact: boolean }>;

export const boundedText = ({ count, exact }: BoundedCount): string => {
  if (exact) {
    return String(count);
  }
  if (count === NONE) {
    return "—";
  }
  return `${String(count)}+`;
};

export const exactWeeks = ({
  stamps,
  limit,
  today,
}: Readonly<{ stamps: readonly string[]; limit: number; today: string }>): Readonly<{
  now: boolean;
  before: boolean;
}> => {
  const partial = Arr.length(stamps) < limit;
  const oldest = pipe(
    Arr.last(stamps),
    Option.getOrElse(() => ""),
  );
  return {
    now: partial || oldest < weekStart(today),
    before: partial || oldest < previousWeekStart(today),
  };
};
