import type { ComponentProps, ReactNode } from "react";

import { cn } from "#/shared/lib/cn.ts";
import { TABLE_CLASS, TABLE_CONTAINER_CLASS } from "#/shared/lib/table-class.ts";

const FOCUSABLE = 0;

export type TableProps = ComponentProps<"table"> &
  Readonly<{ containerClassName?: string }> &
  (
    | Readonly<{ label: string; labelledBy?: never }>
    | Readonly<{ labelledBy: string; label?: never }>
  );

export const Table = ({
  className,
  containerClassName,
  label,
  labelledBy,
  ...props
}: TableProps): ReactNode => (
  <section
    data-slot="table-container"
    aria-label={label}
    aria-labelledby={labelledBy}
    className={cn(TABLE_CONTAINER_CLASS, containerClassName)}
    tabIndex={FOCUSABLE}
  >
    <table data-slot="table" className={cn(TABLE_CLASS, className)} {...props} />
  </section>
);
