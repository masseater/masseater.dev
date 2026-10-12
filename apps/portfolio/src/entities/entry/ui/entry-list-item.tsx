import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry/model/entry";

import { EntryMeta } from "./entry-meta";

const EntryListItem = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <li className="entry-rise flex">
    <Link
      className="entry-tile flex w-full flex-col gap-3 p-6"
      params={entry}
      to="/$category/$slug"
    >
      <span className="font-display text-xl font-light">{entry.title}</span>
      <span className="text-foreground/70 flex-1 text-sm">{entry.description}</span>
      <EntryMeta entry={entry} />
    </Link>
  </li>
);

export { EntryListItem };
