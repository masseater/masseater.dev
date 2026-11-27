import { cn } from "@masseater.dev/ui/cn";
import { TableCell as BaseTableCell } from "@masseater.dev/ui/table";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";

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

export const TableCell = ({
  className,
  variant = "default",
  ...props
}: ComponentProps<"td"> & Readonly<VariantProps<typeof tableCellVariants>>): ReactNode => (
  <BaseTableCell className={cn(tableCellVariants({ variant }), className)} {...props} />
);
