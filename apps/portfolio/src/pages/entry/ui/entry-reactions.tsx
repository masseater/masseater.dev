import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry";

import { ShareLinks } from "./share-links";
import { StarButton } from "./star-button";

const EntryReactions = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <footer className="border-foreground/10 text-foreground/50 font-display flex min-h-12 flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t pt-6 text-xs tracking-widest">
    <StarButton entry={entry} />
    <ShareLinks entry={entry} />
  </footer>
);

export { EntryReactions };
