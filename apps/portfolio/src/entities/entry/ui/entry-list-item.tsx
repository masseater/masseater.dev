import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry/model/entry";

import { EntryMeta } from "./entry-meta";

const EntryListItem = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <li className="flex flex-col gap-2 py-6">
    <Link
      className="font-display text-2xl font-light underline-offset-8 hover:underline focus-visible:underline"
      params={entry}
      to="/$category/$slug"
    >
      {entry.title}
    </Link>
    <p className="text-foreground/70">{entry.description}</p>
    <EntryMeta entry={entry} />
  </li>
);

export { EntryListItem };
