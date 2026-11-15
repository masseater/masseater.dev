import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { useTimeline } from "#/pages/timeline/api/timeline-query.ts";
import { RowList, Section } from "#/shared/ui/index.ts";

import { TimelineRow } from "./timeline-row";

const LABEL = "年表";

export const TimelinePage = (): ReactNode => (
  <Section title={LABEL}>
    <RowList label={LABEL}>
      {pipe(
        useTimeline(),
        Arr.map((entry) => <TimelineRow entry={entry} key={entry.key} />),
      )}
    </RowList>
  </Section>
);
