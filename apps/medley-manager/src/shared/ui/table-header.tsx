import type { ComponentProps, ReactNode } from "react";

import { cn } from "#/shared/lib/utils.ts";

export const TableHeader = ({ className, ...props }: ComponentProps<"thead">): ReactNode => (
  <thead data-slot="table-header" className={cn("[&_tr]:border-b", className)} {...props} />
);
