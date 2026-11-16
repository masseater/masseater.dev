import { SITE_NAMES } from "@masseater.dev/media-notes-ui";
import { useCallback } from "react";
import type { ReactNode } from "react";

import type { Shelf } from "#/pages/review/model/shelf.ts";

const DAY = new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric" });

export const ShelfRow = ({
  shelf,
  onOpen,
}: Readonly<{ shelf: Shelf; onOpen: (shelf: Shelf) => void }>): ReactNode => {
  const open = useCallback(() => {
    onOpen(shelf);
  }, [onOpen, shelf]);
  const { media } = shelf.latest;
  return (
    <li>
      <button
        type="button"
        className="hover:bg-accent flex w-full items-baseline gap-3 rounded-md px-2 py-2 text-left text-sm"
        onClick={open}
      >
        <span className="text-muted-foreground w-16 shrink-0 text-xs">
          {SITE_NAMES[media.source.site]}
        </span>
        <span className="min-w-0 flex-1 truncate">{media.title}</span>
        <span className="text-muted-foreground font-mono text-xs tabular-nums">
          {`${shelf.count} 件 · ${DAY.format(shelf.latest.at)}`}
        </span>
      </button>
    </li>
  );
};
