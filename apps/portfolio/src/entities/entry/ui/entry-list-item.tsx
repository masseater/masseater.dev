import { nameTransition } from "@masseater.dev/ui";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry/model/entry";

import { EntryTileFooter } from "./entry-tile-footer";
import { entryTitleTransition } from "./entry-transition";

const EntryListItem = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <li className="entry-rise flex">
    <Link
      className="entry-tile group flex w-full flex-col gap-4 p-6"
      params={entry}
      to="/$category/$slug"
    >
      <span
        className="vt-entry font-display self-start text-xl leading-snug font-light text-balance"
        data-vt={entryTitleTransition(entry)}
        ref={nameTransition}
      >
        {entry.title}
      </span>
      <span className="text-foreground/70 line-clamp-4 flex-1 text-sm leading-relaxed">
        {entry.description}
      </span>
      <EntryTileFooter entry={entry} />
    </Link>
  </li>
);

export { EntryListItem };
