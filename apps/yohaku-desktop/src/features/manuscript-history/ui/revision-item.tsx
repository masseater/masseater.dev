import { Button } from "@masseater.dev/ui/button";
import { useCallback } from "react";
import type { ReactNode } from "react";

import type { Revision } from "#/shared/api";

const RESTORE = "戻す";

const when = new Intl.DateTimeFormat("ja-JP", {
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export const RevisionItem = ({
  revision,
  restore,
}: Readonly<{ revision: Revision; restore: (revision: string) => void }>): ReactNode => {
  const restoreThis = useCallback(() => {
    restore(revision.id);
  }, [restore, revision.id]);
  return (
    <li className="flex items-center gap-3 py-1.5 text-sm">
      <time className="text-muted-foreground shrink-0 tabular-nums">
        {when.format(revision.savedAt)}
      </time>
      <span className="min-w-0 flex-1 truncate font-serif">{revision.excerpt}</span>
      <span className="text-muted-foreground shrink-0 tabular-nums">{`${revision.characters.toString()} 字`}</span>
      <Button size="sm" variant="ghost" onClick={restoreThis}>
        {RESTORE}
      </Button>
    </li>
  );
};
