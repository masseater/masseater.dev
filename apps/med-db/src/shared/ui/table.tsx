import type { ComponentProps, ReactNode } from "react";

import { cn } from "#/shared/lib/utils.ts";

export const Table = ({
  className,
  label,
  ...props
}: ComponentProps<"table"> & Readonly<{ label: string }>): ReactNode => (
  <section
    data-slot="table-container"
    aria-label={label}
    tabIndex={0}
    className="bg-card relative w-full overflow-x-auto rounded-xl border"
  >
    <table
      data-slot="table"
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </section>
);
