import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import type { Layout } from "#/entities/entry/model/category";
import type { Entry } from "#/entities/entry/model/entry";

import { EntryIndexItem } from "./entry-index-item";
import { EntryListItem } from "./entry-list-item";

const EMPTY_MESSAGE = "まだ何もない。";

const FIRST_ORDER = 1;

const EntryList = ({
  layout,
  entries,
}: Readonly<{ layout: Layout; entries: readonly Entry[] }>): ReactNode => {
  if (!Array.isReadonlyArrayNonEmpty(entries)) {
    return (
      <p className="glass-surface text-foreground/70 font-display px-6 py-16 text-center text-sm tracking-widest">
        {EMPTY_MESSAGE}
      </p>
    );
  }
  if (layout === "index") {
    return (
      <ol className="divide-foreground/10 border-foreground/10 flex flex-col divide-y border-y">
        {pipe(
          entries,
          Array.map((entry, index) => (
            <EntryIndexItem
              entry={entry}
              key={`${entry.category}/${entry.slug}`}
              order={index + FIRST_ORDER}
            />
          )),
        )}
      </ol>
    );
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
      {pipe(
        entries,
        Array.map((entry) => (
          <EntryListItem entry={entry} key={`${entry.category}/${entry.slug}`} />
        )),
      )}
    </ul>
  );
};

export { EntryList };
