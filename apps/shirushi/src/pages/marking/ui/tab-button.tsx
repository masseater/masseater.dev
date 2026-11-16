import { useAtomSet } from "@effect/atom-react";
import { cn } from "@masseater.dev/ui/cn";
import { useCallback } from "react";
import type { KeyboardEvent, ReactNode } from "react";

import { tabAtom } from "#/pages/marking/model/tab.ts";
import type { TabId } from "#/pages/marking/model/tab.ts";

const NONE = 0;

const FOCUSABLE = 0;

const SKIPPED = -1;

const focusable = (active: boolean): number => {
  if (active) {
    return FOCUSABLE;
  }
  return SKIPPED;
};

export const TabButton = ({
  id,
  label,
  waiting,
  active,
  onKeyDown,
}: Readonly<{
  id: TabId;
  label: string;
  waiting: number;
  active: boolean;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}>): ReactNode => {
  const select = useAtomSet(tabAtom);
  const pick = useCallback(() => {
    select(id);
  }, [select, id]);
  return (
    <button
      type="button"
      role="tab"
      id={`tab-${id}`}
      aria-selected={active}
      aria-controls={`panel-${id}`}
      tabIndex={focusable(active)}
      className={cn(
        "text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 -mb-px flex flex-1 items-center justify-center gap-1.5 border-b-2 border-transparent px-2 py-2 text-sm outline-none focus-visible:ring-3",
        active && "border-foreground text-foreground font-medium",
      )}
      onClick={pick}
      onKeyDown={onKeyDown}
    >
      {label}
      {waiting > NONE && (
        <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-xs tabular-nums">
          {waiting}
        </span>
      )}
    </button>
  );
};
