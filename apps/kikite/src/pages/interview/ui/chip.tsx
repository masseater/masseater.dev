import { cn } from "@masseater.dev/ui/cn";
import type { ReactNode } from "react";

const Chip = ({
  active,
  label,
  onClick,
}: Readonly<{ active: boolean; label: string; onClick: () => void }>): ReactNode => (
  <button
    type="button"
    aria-pressed={active}
    className={cn(
      "rounded-full border px-3 py-1 text-sm transition-colors",
      active && "border-primary bg-primary text-primary-foreground",
      !active && "border-border bg-background hover:bg-accent",
    )}
    onClick={onClick}
  >
    {label}
  </button>
);

export { Chip };
