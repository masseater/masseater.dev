import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry";

const EntryTitleBar = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <div
    aria-hidden
    className="entry-title-bar below-site-header bg-background/90 fixed inset-x-0 z-10 items-center border-b backdrop-blur-xl"
    data-entry-title-bar
  >
    <p className="font-display w-full truncate px-6 text-sm">{entry.title}</p>
  </div>
);

export { EntryTitleBar };
