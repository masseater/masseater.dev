import { cn } from "@masseater.dev/web-ui";
import type { ComponentProps, ReactNode } from "react";

const Table = ({ className, ...props }: ComponentProps<"table">): ReactNode => (
  <div data-slot="table-container" className="relative w-full overflow-x-auto">
    <table
      data-slot="table"
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
);

export { Table };
