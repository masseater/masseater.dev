import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry/index.ts";
import { StarButton } from "#/features/star/index.ts";

export const EntryReactions = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <div className="text-foreground/60 font-display flex flex-col items-center gap-6 text-xs tracking-widest">
    <StarButton entry={entry} />
  </div>
);
