import { nameTransition } from "@masseater.dev/ui";
import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry/model/entry";

import { entryTitleTransition } from "./entry-transition";

const EntryIndexTitle = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <span
    className="vt-entry entry-index-title font-display self-start font-light"
    data-vt={entryTitleTransition(entry)}
    ref={nameTransition}
  >
    {entry.title}
  </span>
);

export { EntryIndexTitle };
