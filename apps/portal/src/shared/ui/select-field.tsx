import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

export type Choice = Readonly<{ value: string; label: string }>;

const SELECT =
  "border-input focus-visible:ring-ring h-10 min-w-36 rounded-md border bg-white px-3 text-sm font-normal outline-none focus-visible:ring-2";

const EVERY = "";

export const SelectField = ({
  all,
  choices,
  label,
  name,
  value,
}: Readonly<{
  all: string;
  choices: readonly Choice[];
  label: string;
  name: string;
  value: string;
}>): ReactNode => (
  <label className="flex flex-col gap-1 text-xs font-bold">
    {label}
    <select className={SELECT} defaultValue={value} name={name}>
      <option value={EVERY}>{all}</option>
      {pipe(
        choices,
        Arr.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.label}
          </option>
        )),
      )}
    </select>
  </label>
);
