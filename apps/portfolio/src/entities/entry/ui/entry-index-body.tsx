import { Option } from "effect";
import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry/model/entry";

import { EntryIndexTitle } from "./entry-index-title";
import { EntryMeta } from "./entry-meta";
import { EntryStars } from "./entry-stars";

const EntryIndexBody = ({
  entry,
  stars,
}: Readonly<{ entry: Entry; stars: Option.Option<number> }>): ReactNode => (
  <div className="flex min-w-0 flex-col gap-3">
    <EntryIndexTitle entry={entry} />
    <p className="text-foreground/70 max-w-xl text-sm">{entry.description}</p>
    <div className="flex flex-wrap items-center gap-4">
      <EntryMeta entry={entry} />
      {Option.isSome(stars) && <EntryStars count={stars.value} />}
    </div>
  </div>
);

export { EntryIndexBody };
