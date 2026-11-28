import type { ComponentProps, ReactNode } from "react";

import { cn } from "#/shared/lib/cn.ts";
import { TABLE_BODY_CLASS } from "#/shared/lib/table-class.ts";

export const TableBody = ({ className, ...props }: ComponentProps<"tbody">): ReactNode => (
  <tbody data-slot="table-body" className={cn(TABLE_BODY_CLASS, className)} {...props} />
);
