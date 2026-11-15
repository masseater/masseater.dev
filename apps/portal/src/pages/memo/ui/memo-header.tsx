import type { ReactNode } from "react";

import type { MemoValue } from "#/entities/watashi";
import { RetractedNote } from "#/entities/watashi";
import { TagList } from "#/shared/ui";

export const MemoHeader = ({ memo }: Readonly<{ memo: MemoValue }>): ReactNode => (
  <header className="flex flex-col gap-2">
    <p className="text-muted-foreground text-xs">{memo.project}</p>
    <h1 className="text-std-24B-150 break-words">{memo.name}</h1>
    <TagList tags={memo.evidence} />
    <RetractedNote memo={memo} />
  </header>
);
