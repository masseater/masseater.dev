import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry/index.ts";

import { EntryReactions } from "./entry-reactions.tsx";

export const EntrySide = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <aside className="hidden w-20 shrink-0 lg:block">
    <div className="below-entry-title-bar sticky">
      <EntryReactions entry={entry} />
    </div>
  </aside>
);
