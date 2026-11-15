import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { useTimeline } from "#/pages/timeline/api/timeline-query";
import { RowList } from "#/shared/ui";

import { TimelineRow } from "./timeline-row";

const LABEL = "年表";

const TimelinePage = (): ReactNode => (
  <RowList label={LABEL}>
    {pipe(
      useTimeline(),
      Arr.map((entry) => <TimelineRow entry={entry} key={entry.key} />),
    )}
  </RowList>
);

export { TimelinePage };
