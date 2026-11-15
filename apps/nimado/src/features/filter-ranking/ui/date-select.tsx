import { Array as Arr, pipe } from "effect";
import { useCallback } from "react";
import type { ChangeEventHandler, ReactNode } from "react";

const DateSelect = ({
  label,
  dates,
  value,
  onChoose,
}: Readonly<{
  label: string;
  dates: readonly string[];
  value: string;
  onChoose: (date: string) => void;
}>): ReactNode => {
  const change = useCallback<ChangeEventHandler<HTMLSelectElement>>(
    (event) => {
      onChoose(event.target.value);
    },
    [onChoose],
  );
  return (
    <label className="flex items-center gap-2 text-sm">
      {label}
      <select
        value={value}
        onChange={change}
        className="bg-background rounded-md border px-2 py-1 tabular-nums"
      >
        {pipe(
          dates,
          Arr.map((date) => (
            <option key={date} value={date}>
              {date}
            </option>
          )),
        )}
      </select>
    </label>
  );
};

export { DateSelect };
