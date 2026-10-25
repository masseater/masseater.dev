import { nameTransition } from "@masseater.dev/ui";
import { Link } from "@tanstack/react-router";
import type { Option } from "effect";
import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry/model/entry";

import { EntryListFooter } from "./entry-list-footer";
import { entryTitleTransition } from "./entry-transition";

const EntryListItem = ({
  entry,
  stars,
}: Readonly<{ entry: Entry; stars: Option.Option<number> }>): ReactNode => (
  <li className="entry-rise border-foreground/10 flex border-t">
    <Link
      className="group flex w-full flex-col gap-4 pt-6 pb-10"
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
      <EntryListFooter entry={entry} stars={stars} />
    </Link>
  </li>
);

export { EntryListItem };
