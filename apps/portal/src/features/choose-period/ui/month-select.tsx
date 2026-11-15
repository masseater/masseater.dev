import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

const FIELD =
  "border-input focus-visible:ring-ring h-10 rounded-md border bg-white px-3 text-sm tabular-nums outline-none focus-visible:ring-2";

export const MonthSelect = ({
  label,
  months,
  name,
  value,
}: Readonly<{
  label: string;
  months: readonly string[];
  name: string;
  value: string;
}>): ReactNode => (
  <select aria-label={label} className={FIELD} defaultValue={value} name={name}>
    {pipe(
      months,
      Arr.map((month) => (
        <option key={month} value={month}>
          {month}
        </option>
      )),
    )}
  </select>
);
