import { nameTransition } from "@masseater.dev/ui";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry/model/entry";

import { EntryListFooter } from "./entry-list-footer";
import { entryTitleTransition } from "./entry-transition";

const EntryListItem = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <li className="entry-rise border-foreground/10 flex min-w-0 border-t">
    <Link
      className="group flex w-full min-w-0 flex-col gap-4 pt-6 pb-10"
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
      <EntryListFooter entry={entry} />
    </Link>
  </li>
);

export { EntryListItem };
