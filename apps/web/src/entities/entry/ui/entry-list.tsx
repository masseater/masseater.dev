import { Array } from "effect";
import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry/model/entry";

import { EntryListItem } from "./entry-list-item";

const EMPTY_MESSAGE = "まだ何もない。";

const EntryList = ({ entries }: Readonly<{ entries: readonly Entry[] }>): ReactNode => {
  if (!Array.isReadonlyArrayNonEmpty(entries)) {
    return <p className="text-muted-foreground py-5">{EMPTY_MESSAGE}</p>;
  }
  return (
    <ul className="divide-border flex flex-col divide-y">
      {entries.map((entry) => (
        <EntryListItem entry={entry} key={`${entry.category}/${entry.slug}`} />
      ))}
    </ul>
  );
};

export { EntryList };
