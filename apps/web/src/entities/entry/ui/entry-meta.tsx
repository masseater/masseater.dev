import type { ReactNode } from "react";

import type { Entry } from "#/entities/entry/model/entry";

import { TagList } from "./tag-list";

const DRAFT_LABEL = "下書き";

const EntryMeta = ({ entry }: Readonly<{ entry: Entry }>): ReactNode => (
  <div className="text-foreground/70 font-display flex flex-wrap items-center gap-x-4 gap-y-1 text-xs tracking-widest uppercase">
    {entry.date !== "" && <time dateTime={entry.date}>{entry.date}</time>}
    {entry.status === "draft" && <span className="text-destructive">{DRAFT_LABEL}</span>}
    <TagList tags={entry.tags} />
  </div>
);

export { EntryMeta };
