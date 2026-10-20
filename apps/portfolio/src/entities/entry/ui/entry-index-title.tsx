import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry/model/entry";

import { entryTitleTransition } from "./entry-transition";

const EntryIndexTitle = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <span
    className="vt-attr vt-entry entry-index-title font-display self-start font-light"
    data-vt={entryTitleTransition(entry)}
  >
    {entry.title}
  </span>
);

export { EntryIndexTitle };
