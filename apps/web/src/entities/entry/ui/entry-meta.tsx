import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry/model/entry";

import { TagList } from "./tag-list";

const DRAFT_LABEL = "下書き";

const EntryMeta = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
    <time dateTime={entry.date}>{entry.date}</time>
    {entry.status === "draft" && <span className="text-destructive">{DRAFT_LABEL}</span>}
    <TagList tags={entry.tags} />
  </div>
);

export { EntryMeta };
