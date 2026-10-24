import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry/model/entry";
import { Arrow } from "#/shared/ui";

import { EntryMeta } from "./entry-meta";

const EntryListFooter = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <span className="flex items-end justify-between gap-4">
    <EntryMeta entry={entry} />
    <Arrow variant="tile" />
  </span>
);

export { EntryListFooter };
