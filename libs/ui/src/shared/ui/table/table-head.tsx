import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "#/shared/lib/cn.ts";

const tableHeadVariants = cva(
  "text-left align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-0.5",
  {
    variants: {
      variant: {
        plain: "h-10 px-2 font-medium text-foreground",
        tinted: "h-10 bg-muted px-4 text-xs font-bold text-muted-foreground",
        ruled: "border-b-2 border-input px-2 py-2 text-xs font-bold text-muted-foreground",
        compact: "bg-muted px-3 py-2 font-medium",
      },
    },
    defaultVariants: { variant: "plain" },
  },
);

export type TableHeadVariant = NonNullable<VariantProps<typeof tableHeadVariants>["variant"]>;

export const TableHead = ({
  className,
  variant,
  ...props
}: ComponentProps<"th"> & Readonly<VariantProps<typeof tableHeadVariants>>): ReactNode => (
  <th data-slot="table-head" className={cn(tableHeadVariants({ variant }), className)} {...props} />
);
