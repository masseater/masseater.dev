import { Array, Option, pipe, Record } from "effect";
import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry/model/entry.ts";

import { EntryEmpty } from "./entry-empty.tsx";
import { EntryListItem } from "./entry-list-item.tsx";

const NO_STARS = 0;

const starsOf =
  (starCounts: Option.Option<Record.ReadonlyRecord<string, number>>) =>
  (entry: Entry): Option.Option<number> =>
    pipe(
      starCounts,
      Option.map((counts) => Option.getOrElse(Record.get(counts, entry.slug), () => NO_STARS)),
    );

export const EntryList = ({
  entries,
  starCounts,
}: Readonly<{
  entries: readonly Entry[];
  starCounts: Option.Option<Record.ReadonlyRecord<string, number>>;
}>): ReactNode => {
  if (!Array.isReadonlyArrayNonEmpty(entries)) {
    return <EntryEmpty />;
  }
  return (
    <ul className="grid gap-x-8 sm:grid-cols-2 md:grid-cols-3" role="list">
      {pipe(
        entries,
        Array.map((entry) => (
          <EntryListItem
            entry={entry}
            key={`${entry.category}/${entry.slug}`}
            stars={starsOf(starCounts)(entry)}
          />
        )),
      )}
    </ul>
  );
};
