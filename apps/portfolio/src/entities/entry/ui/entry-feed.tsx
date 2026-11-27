import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry/model/entry.ts";

import { EntryEmpty } from "./entry-empty.tsx";
import { EntryFeedRow } from "./entry-feed-row.tsx";

export const EntryFeed = ({ entries }: Readonly<{ entries: readonly Entry[] }>): ReactNode => {
  if (!Array.isReadonlyArrayNonEmpty(entries)) {
    return <EntryEmpty />;
  }
  return (
    <ul role="list">
      {pipe(
        entries,
        Array.map((entry) => <EntryFeedRow entry={entry} key={entry.slug} />),
      )}
    </ul>
  );
};
