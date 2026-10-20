import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry/model/entry";

import { EntryIndexBody } from "./entry-index-body";

const EntryIndexItem = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <li className="entry-rise">
    <Link className="flex py-8 sm:py-12" params={entry} to="/$category/$slug">
      <EntryIndexBody entry={entry} />
    </Link>
  </li>
);

export { EntryIndexItem };
