import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { useEntries } from "#/pages/interview/model/hooks";

import { InterimItem } from "./interim-item.tsx";
import { TimelineItem } from "./timeline-item.tsx";

const Timeline = (): ReactNode => (
  <ol className="flex flex-col gap-3">
    {pipe(
      useEntries(),
      Arr.map((entry) => <TimelineItem key={entry.id} entry={entry} />),
    )}
    <InterimItem />
  </ol>
);

export { Timeline };
