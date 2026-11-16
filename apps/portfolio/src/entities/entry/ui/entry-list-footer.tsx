import { Option } from "effect";
import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry/model/entry.ts";
import { Arrow } from "#/shared/ui/index.ts";

import { EntryMeta } from "./entry-meta.tsx";
import { EntryStars } from "./entry-stars.tsx";

export const EntryListFooter = ({
  entry,
  stars,
}: Readonly<{ entry: Entry; stars: Option.Option<number> }>): ReactNode => (
  <span className="flex items-end justify-between gap-4">
    <EntryMeta entry={entry} />
    <span className="flex shrink-0 items-center gap-4">
      <EntryStars count={Option.getOrUndefined(stars)} />
      <Arrow variant="tile" />
    </span>
  </span>
);
