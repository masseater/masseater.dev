import type { ComponentProps, ReactNode } from "react";

import { cn } from "#/shared/lib/cn.ts";

export const TableRow = ({ className, ...props }: ComponentProps<"tr">): ReactNode => (
  <tr
    data-slot="table-row"
    className={cn(
      "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
      className,
    )}
    {...props}
  />
);
