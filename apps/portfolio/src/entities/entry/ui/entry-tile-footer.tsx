import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry/model/entry";
import { Arrow } from "#/shared/ui";

import { EntryMeta } from "./entry-meta";

const EntryTileFooter = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <span className="border-foreground/10 flex items-end justify-between gap-4 border-t pt-4">
    <EntryMeta entry={entry} />
    <Arrow variant="tile" />
  </span>
);

export { EntryTileFooter };
