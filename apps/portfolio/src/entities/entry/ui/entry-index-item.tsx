import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry/model/entry";
import { ordinal } from "#/shared/lib";
import { Arrow } from "#/shared/ui";

import { EntryIndexBody } from "./entry-index-body";

const EntryIndexItem = ({ entry, order }: Readonly<{ entry: Entry; order: number }>): ReactNode => (
  <li className="entry-rise">
    <Link className="group flex gap-4 py-8 sm:gap-8 sm:py-12" params={entry} to="/$category/$slug">
      <span className="font-display text-foreground/50 group-hover:text-foreground w-8 shrink-0 pt-3 text-xs tracking-widest tabular-nums transition-colors sm:pt-4">
        {ordinal(order)}
      </span>
      <EntryIndexBody entry={entry} />
      <Arrow variant="index" />
    </Link>
  </li>
);

export { EntryIndexItem };
