import type { ReactNode } from "react";

import type { MemoValue } from "#/entities/watashi";
import { RetractedNote } from "#/entities/watashi";
import { TagList } from "#/shared/ui";

export const MemoHeader = ({ memo }: Readonly<{ memo: MemoValue }>): ReactNode => (
  <header className="flex flex-col gap-2">
    <p className="font-display text-foreground/50 text-xs tracking-widest">{memo.project}</p>
    <h1 className="font-display text-3xl font-light break-words">{memo.name}</h1>
    <TagList tags={memo.evidence} />
    <RetractedNote memo={memo} />
  </header>
);
