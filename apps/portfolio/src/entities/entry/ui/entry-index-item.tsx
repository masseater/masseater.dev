import { followPointer, releasePointer } from "@masseater.dev/ui";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry/model/entry";

import { EntryIndexBody } from "./entry-index-body";

const EntryIndexItem = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <li className="entry-rise">
    <Link
      className="stage entry-index-number flex gap-6 py-8 sm:gap-10 sm:py-12"
      onPointerCancel={releasePointer}
      onPointerLeave={releasePointer}
      onPointerMove={followPointer}
      params={entry}
      to="/$category/$slug"
    >
      <EntryIndexBody entry={entry} />
    </Link>
  </li>
);

export { EntryIndexItem };
