import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

const tableCellVariants = cva("px-4 py-3 align-middle", {
  variants: {
    variant: {
      default: "",
      count: "font-bold text-primary tabular-nums",
      number: "tabular-nums",
      muted: "text-muted-foreground",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const TableCell = ({
  className,
  variant = "default",
  ...props
}: ComponentProps<"td"> & Readonly<VariantProps<typeof tableCellVariants>>): ReactNode => (
  <td data-slot="table-cell" className={cn(tableCellVariants({ variant }), className)} {...props} />
);

export { TableCell };
