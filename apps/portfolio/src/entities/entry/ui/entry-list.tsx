import { Array } from "effect";
import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry/model/entry";

import { EntryListItem } from "./entry-list-item";

const EMPTY_MESSAGE = "まだ何もない。";

const EntryList = ({ entries }: Readonly<{ entries: readonly Entry[] }>): ReactNode => {
  if (!Array.isReadonlyArrayNonEmpty(entries)) {
    return <p className="text-foreground/70 py-6 text-center">{EMPTY_MESSAGE}</p>;
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map((entry) => (
        <EntryListItem entry={entry} key={`${entry.category}/${entry.slug}`} />
      ))}
    </ul>
  );
};

export { EntryList };
