import { cn } from "@masseater.dev/web-ui";
import type { ComponentProps, ReactNode } from "react";

const FOCUSABLE = 0;

export const Table = ({
  className,
  labelledBy,
  ...props
}: ComponentProps<"table"> & Readonly<{ labelledBy: string }>): ReactNode => (
  <section
    data-slot="table-container"
    aria-labelledby={labelledBy}
    className="relative w-full overflow-x-auto"
    tabIndex={FOCUSABLE}
  >
    <table
      data-slot="table"
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </section>
);
