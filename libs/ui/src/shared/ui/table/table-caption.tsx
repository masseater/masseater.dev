import type { ComponentProps, ReactNode } from "react";

import { cn } from "#/shared/lib/cn.ts";
import { TABLE_CAPTION_CLASS } from "#/shared/lib/table-class.ts";

export const TableCaption = ({ className, ...props }: ComponentProps<"caption">): ReactNode => (
  <caption data-slot="table-caption" className={cn(TABLE_CAPTION_CLASS, className)} {...props} />
);
