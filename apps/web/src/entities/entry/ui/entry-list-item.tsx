import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry/model/entry";

import { EntryMeta } from "./entry-meta";

const EntryListItem = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <li className="flex flex-col gap-2 py-5">
    <Link
      className="text-lg font-semibold underline-offset-4 hover:underline focus-visible:underline"
      params={entry}
      to="/$category/$slug"
    >
      {entry.title}
    </Link>
    <p className="text-muted-foreground">{entry.description}</p>
    <EntryMeta entry={entry} />
  </li>
);

export { EntryListItem };
