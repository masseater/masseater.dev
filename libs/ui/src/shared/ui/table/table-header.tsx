import type { ComponentProps, ReactNode } from "react";

import { cn } from "#/shared/lib/cn.ts";
import { TABLE_HEADER_CLASS } from "#/shared/lib/table-class.ts";

export const TableHeader = ({ className, ...props }: ComponentProps<"thead">): ReactNode => (
  <thead data-slot="table-header" className={cn(TABLE_HEADER_CLASS, className)} {...props} />
);
