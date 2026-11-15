import { cn } from "@masseater.dev/ui/cn";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { usePanel, useSetPanel } from "#/entities/interview";

import type { PanelLabel } from "./panels.ts";

const NONE = 0;

const PanelTab = ({ panel, count }: Readonly<{ panel: PanelLabel; count: number }>): ReactNode => {
  const selected = usePanel() === panel.id;
  const setPanel = useSetPanel();
  const select = useCallback(() => {
    setPanel(panel.id);
  }, [setPanel, panel.id]);
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      className={cn(
        "text-muted-foreground flex-1 border-b-2 border-transparent py-2 text-sm",
        selected && "border-foreground text-foreground font-semibold",
      )}
      onClick={select}
    >
      {panel.label}
      {count > NONE && <span className="ml-1 tabular-nums">{count}</span>}
    </button>
  );
};

export { PanelTab };
