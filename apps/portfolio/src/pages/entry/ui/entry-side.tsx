import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry";

import { EntryReactions } from "./entry-reactions";

const EntrySide = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <aside className="hidden w-20 shrink-0 lg:block">
    <div className="below-entry-title-bar sticky">
      <EntryReactions entry={entry} />
    </div>
  </aside>
);

export { EntrySide };
