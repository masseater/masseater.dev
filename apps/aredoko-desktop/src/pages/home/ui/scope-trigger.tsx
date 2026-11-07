import { ChevronDown, Package } from "lucide-react";
import { Select } from "radix-ui";
import type { ReactNode } from "react";

const LABEL = "パッケージ";

const ScopeTrigger = (): ReactNode => (
  <Select.Trigger
    aria-label={LABEL}
    className="hover:bg-accent focus-visible:ring-ring flex h-7 max-w-72 items-center gap-1.5 rounded-md border px-2.5 text-xs outline-none focus-visible:ring-2"
  >
    <Package className="size-3.5 shrink-0" />
    <span className="truncate">
      <Select.Value />
    </span>
    <ChevronDown className="size-3.5 shrink-0 opacity-60" />
  </Select.Trigger>
);

export { ScopeTrigger };
