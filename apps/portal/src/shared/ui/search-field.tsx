import { Array as Arr, Record as Rec, pipe } from "effect";
import { Search } from "lucide-react";
import type { ReactNode } from "react";

const NOTHING_KEPT: Readonly<Record<string, string>> = {};

export const SearchField = ({
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
  <search className="w-full max-w-md min-w-0">
    <form action={action} className="relative" method="get">
      {pipe(
        Rec.toEntries(kept),
        Arr.map(([name, keptValue]) => (
          <input key={name} name={name} type="hidden" value={keptValue} />
        )),
      )}
      <Search
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
      />
      <input
        aria-label={label}
        className="border-input focus-visible:ring-ring h-10 w-full rounded-md border bg-white pr-3 pl-9 text-base outline-none focus-visible:ring-2"
        defaultValue={value}
        name="keyword"
        placeholder={label}
        type="search"
      />
    </form>
  </search>
);
