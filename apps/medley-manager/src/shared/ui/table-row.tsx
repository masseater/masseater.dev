import type { ComponentProps, ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

const TableRow = ({ className, ...props }: ComponentProps<"tr">): ReactNode => (
  <tr
    data-slot="table-row"
    className={cn("border-b transition-colors hover:bg-muted/50", className)}
    {...props}
  />
);

export { TableRow };
