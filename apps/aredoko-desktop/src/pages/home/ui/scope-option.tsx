import { Select } from "radix-ui";
import type { ReactNode } from "react";

const ALL_PACKAGES = "all";

const ScopeOption = ({
  value,
  label,
  count,
}: Readonly<{ value: string; label: string; count: string }>): ReactNode => (
  <Select.Item
    value={value}
    className="data-[highlighted]:bg-accent flex justify-between gap-4 rounded-sm px-2 py-1.5 text-xs outline-none"
  >
    <Select.ItemText>{label}</Select.ItemText>
    <span className="text-muted-foreground">{count}</span>
  </Select.Item>
);

export { ALL_PACKAGES, ScopeOption };
