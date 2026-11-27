import type { ReactNode } from "react";

import type { TimelineEntry } from "#/entities/watashi/index.ts";
import { Row, TagList } from "#/shared/ui/index.ts";

export const TimelineRow = ({ entry }: Readonly<{ entry: TimelineEntry }>): ReactNode => (
  <Row lead={entry.when}>
    <p className="text-std-17B-170 break-words">{entry.title}</p>
    {entry.note !== "" && <p className="text-muted-foreground text-sm break-words">{entry.note}</p>}
    <TagList tags={entry.labels} />
  </Row>
);
