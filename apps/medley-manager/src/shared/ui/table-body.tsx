import type { ComponentProps, ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

const TableBody = ({ className, ...props }: ComponentProps<"tbody">): ReactNode => (
  <tbody
    data-slot="table-body"
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
);

export { TableBody };
