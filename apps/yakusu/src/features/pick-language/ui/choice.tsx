import { cn } from "@masseater.dev/ui/cn";
import { Check } from "lucide-react";
import type { ReactNode } from "react";

const Choice = ({
  chosen,
  label,
  onChoose,
}: Readonly<{ chosen: boolean; label: string; onChoose: () => void }>): ReactNode => (
  <button
    className={cn(
      "flex w-full break-inside-avoid items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent",
      chosen && "text-highlight",
    )}
    type="button"
    onClick={onChoose}
  >
    <Check className={cn("size-4 shrink-0", !chosen && "invisible")} />
    {label}
  </button>
);

export { Choice };
