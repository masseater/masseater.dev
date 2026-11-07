import type { ComponentProps, ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

const TableHead = ({ className, ...props }: ComponentProps<"th">): ReactNode => (
  <th
    data-slot="table-head"
    className={cn(
      "h-10 bg-muted px-4 text-left align-middle text-xs font-bold whitespace-nowrap text-muted-foreground",
      className,
    )}
    {...props}
  />
);

export { TableHead };
