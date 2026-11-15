import { cn } from "@masseater.dev/ui/cn";
import type { ReactNode } from "react";

const LanguageTab = ({
  active,
  label,
  onSelect,
}: Readonly<{ active: boolean; label: string; onSelect: () => void }>): ReactNode => (
  <button
    aria-pressed={active}
    className={cn(
      "h-12 shrink-0 border-b-2 px-4 text-sm font-medium whitespace-nowrap transition-colors hover:bg-accent",
      active && "border-highlight text-highlight",
      !active && "border-transparent text-muted-foreground hover:text-foreground",
    )}
    type="button"
    onClick={onSelect}
  >
    {label}
  </button>
);

export { LanguageTab };
