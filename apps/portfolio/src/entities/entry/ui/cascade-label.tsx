import type { ReactNode } from "react";

const CascadeLabel = ({
  label,
  detail,
}: Readonly<{ label: string; detail: string }>): ReactNode => (
  <span className="flex min-w-0 flex-col items-start">
    <span className="truncate text-sm font-semibold">{label}</span>
    <span className="text-muted-foreground truncate text-xs empty:hidden">{detail}</span>
  </span>
);

export { CascadeLabel };
