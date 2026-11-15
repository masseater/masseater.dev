import type { ReactNode } from "react";

import type { TimelineEntry } from "#/entities/watashi";
import { Row, TagList } from "#/shared/ui";

const TimelineRow = ({ entry }: Readonly<{ entry: TimelineEntry }>): ReactNode => (
  <Row lead={entry.when}>
    <p className="font-display text-lg font-light">{entry.title}</p>
    {entry.note !== "" && <p className="text-foreground/70 text-sm">{entry.note}</p>}
    <TagList tags={entry.labels} />
  </Row>
);

export { TimelineRow };
