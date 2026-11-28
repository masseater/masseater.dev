import type { ComponentProps, ReactNode } from "react";

import { cn } from "#/shared/lib/cn.ts";
import { TABLE_ROW_CLASS } from "#/shared/lib/table-class.ts";

export const TableRow = ({ className, ...props }: ComponentProps<"tr">): ReactNode => (
  <tr data-slot="table-row" className={cn(TABLE_ROW_CLASS, className)} {...props} />
);
