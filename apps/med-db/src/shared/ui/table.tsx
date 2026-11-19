import type { ComponentProps, ReactNode } from "react";

import { cn } from "#/shared/lib/utils.ts";

const FOCUSABLE = 0;

export const Table = ({
  className,
  label,
  ...props
}: ComponentProps<"table"> & Readonly<{ label: string }>): ReactNode => (
  <section
    data-slot="table-container"
    aria-label={label}
    className="bg-card relative w-full overflow-x-auto rounded-xl border"
    tabIndex={FOCUSABLE}
  >
    <table
      data-slot="table"
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </section>
);
