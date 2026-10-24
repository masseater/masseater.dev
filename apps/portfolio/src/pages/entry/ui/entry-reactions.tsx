import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry";
import type { Direction } from "#/pages/entry/model/direction";

import { ShareLinks } from "./share-links";
import { StarButton } from "./star-button";

const REACTIONS_CLASS = {
  row: "flex min-h-12 flex-wrap items-center justify-between gap-x-6 gap-y-3",
  column: "flex flex-col items-center gap-6",
} as const;

const EntryReactions = ({
  entry,
  direction,
}: Readonly<{ entry: Entry; direction: Direction }>): ReactNode => (
  <div
    className={`text-foreground/60 font-display text-xs tracking-widest ${REACTIONS_CLASS[direction]}`}
  >
    <StarButton entry={entry} />
    <ShareLinks direction={direction} entry={entry} />
  </div>
);

export { EntryReactions };
