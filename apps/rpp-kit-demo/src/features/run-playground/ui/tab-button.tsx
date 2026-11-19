import type { KeyboardEvent, ReactNode } from "react";

import type { SourceTab } from "#/features/run-playground/model/tabs.ts";

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
  name,
  label,
  active,
  onSelect,
  onKeyDown,
}: Readonly<{
  id: string;
  name: SourceTab;
  label: string;
  active: boolean;
  onSelect: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}>): ReactNode => (
  <button
    aria-selected={active}
    className="text-muted-foreground aria-selected:border-primary aria-selected:text-foreground -mb-px border-b-2 border-transparent px-3 py-2 font-mono text-xs"
    data-tab={name}
    id={id}
    onClick={onSelect}
    onKeyDown={onKeyDown}
    role="tab"
    tabIndex={focusable(active)}
    type="button"
  >
    {label}
  </button>
);
