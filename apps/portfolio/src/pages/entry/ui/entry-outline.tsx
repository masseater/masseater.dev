import type { ReactNode } from "react";

import { EntryToc } from "#/entities/entry";
import type { Entry } from "#/entities/entry";

const EntryOutline = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <aside className="hidden w-56 shrink-0 lg:block">
    <div className="below-entry-title-bar sticky overflow-y-auto">
      <EntryToc entry={entry} />
    </div>
  </aside>
);

export { EntryOutline };
