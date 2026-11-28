import type { VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "#/shared/lib/cn.ts";
import { tableHeadVariants } from "#/shared/lib/table-class.ts";

export const TableHead = ({
  className,
  variant,
  ...props
}: ComponentProps<"th"> & Readonly<VariantProps<typeof tableHeadVariants>>): ReactNode => (
  <th data-slot="table-head" className={cn(tableHeadVariants({ variant }), className)} {...props} />
);
