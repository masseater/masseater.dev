import { Array as Arr, Record as Rec, pipe } from "effect";
import type { ReactNode } from "react";

const NOTHING_KEPT: Readonly<Record<string, string>> = {};

const SearchField = ({
  action,
  label,
  value,
  kept = NOTHING_KEPT,
}: Readonly<{
  action: string;
  label: string;
  value: string;
  kept?: Readonly<Record<string, string>>;
}>): ReactNode => (
  <search>
    <form action={action} method="get">
      {pipe(
        Rec.toEntries(kept),
        Arr.map(([name, keptValue]) => (
          <input key={name} name={name} type="hidden" value={keptValue} />
        )),
      )}
      <input
        aria-label={label}
        className="border-foreground/20 focus-visible:border-foreground w-full border-b bg-transparent py-2 text-base outline-none"
        defaultValue={value}
        name="keyword"
        placeholder={label}
        type="search"
      />
    </form>
  </search>
);

export { SearchField };
