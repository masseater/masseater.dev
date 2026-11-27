import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry/model/entry.ts";

export const EntryFeedRow = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <li className="border-foreground/10 flex gap-5 border-t py-4">
    <time
      className="text-foreground/50 font-display w-24 shrink-0 pt-1 text-xs tracking-widest"
      dateTime={entry.date}
    >
      {entry.date}
    </time>
    <Link
      className="flex min-w-0 flex-col gap-1"
      params={entry}
      preload="viewport"
      to="/$category/$slug"
    >
      <span className="font-display text-lg leading-snug font-light">{entry.title}</span>
      <span className="text-foreground/60 line-clamp-1 text-sm">{entry.description}</span>
    </Link>
  </li>
);
