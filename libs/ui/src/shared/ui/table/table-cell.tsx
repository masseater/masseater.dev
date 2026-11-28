import type { ComponentProps, ReactNode } from "react";

import { cn } from "#/shared/lib/cn.ts";
import { TABLE_CELL_CLASS } from "#/shared/lib/table-class.ts";

export const TableCell = ({ className, ...props }: ComponentProps<"td">): ReactNode => (
  <td data-slot="table-cell" className={cn(TABLE_CELL_CLASS, className)} {...props} />
);
