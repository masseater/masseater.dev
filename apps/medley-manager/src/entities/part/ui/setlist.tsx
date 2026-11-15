import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import type { PartRow } from "#/entities/part/lib/part";
import { partStart } from "#/entities/video/@x/part";
import type { Watchable } from "#/entities/video/@x/part";

import { SetlistItem } from "./setlist-item";

const Setlist = ({
  source,
  parts,
}: Readonly<{ source: Watchable; parts: readonly PartRow[] }>): ReactNode => (
  <ol className="bg-card flex flex-col divide-y overflow-hidden rounded-xl border">
    {pipe(
      parts,
      Array.map((part) => (
        <SetlistItem
          key={part.id}
          part={part}
          start={partStart({ source, startSec: part.startSec })}
        />
      )),
    )}
  </ol>
);

export { Setlist };
