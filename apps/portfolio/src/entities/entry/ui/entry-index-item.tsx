import { Link } from "@tanstack/react-router";
import type { Option } from "effect";
import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry/model/entry";
import { Arrow } from "#/shared/ui";

import { EntryIndexBody } from "./entry-index-body";

const EntryIndexItem = ({
  entry,
  stars,
}: Readonly<{ entry: Entry; stars: Option.Option<number> }>): ReactNode => (
  <li className="entry-rise">
    <Link className="group flex gap-8 py-8 sm:py-12" params={entry} to="/$category/$slug">
      <EntryIndexBody entry={entry} stars={stars} />
      <Arrow variant="index" />
    </Link>
  </li>
);

export { EntryIndexItem };
