import { cn } from "@masseater.dev/web-ui";
import type { ComponentProps, ReactNode } from "react";

const TableRow = ({ className, ...props }: ComponentProps<"tr">): ReactNode => (
  <tr
    data-slot="table-row"
    className={cn(
      "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
      className,
    )}
    {...props}
  />
);

export { TableRow };
