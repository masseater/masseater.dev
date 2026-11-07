import { cn } from "@masseater.dev/web-ui";
import type { ComponentProps, ReactNode } from "react";

const TableHead = ({ className, ...props }: ComponentProps<"th">): ReactNode => (
  <th
    data-slot="table-head"
    className={cn(
      "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-0.5",
      className,
    )}
    {...props}
  />
);

export { TableHead };
