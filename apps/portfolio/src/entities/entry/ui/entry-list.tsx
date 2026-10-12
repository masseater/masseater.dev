import { Array } from "effect";
import type { ReactNode } from "react";

import type { Columns } from "#/entities/entry/model/category";
import type { Entry } from "#/entities/entry/model/entry";

import { EntryListItem } from "./entry-list-item";

const EMPTY_MESSAGE = "まだ何もない。";

const COLUMNS_CLASS = {
  single: "mx-auto grid w-full max-w-2xl gap-4",
  grid: "grid gap-4 sm:grid-cols-2 md:grid-cols-3",
} as const satisfies Record<Columns, string>;

const EntryList = ({
  columns,
  entries,
}: Readonly<{ columns: Columns; entries: readonly Entry[] }>): ReactNode => {
  if (!Array.isReadonlyArrayNonEmpty(entries)) {
    return <p className="text-foreground/70 py-6 text-center">{EMPTY_MESSAGE}</p>;
  }
  return (
    <ul className={COLUMNS_CLASS[columns]}>
      {entries.map((entry) => (
        <EntryListItem entry={entry} key={`${entry.category}/${entry.slug}`} />
      ))}
    </ul>
  );
};

export { EntryList };
