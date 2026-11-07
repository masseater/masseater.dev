import type { ComponentProps, ReactNode } from "react";

import { cn } from "./cn.ts";

type BadgeProps<Variant extends string> = ComponentProps<"span"> &
  Readonly<{ variant: Variant; variants: (props: Readonly<{ variant: Variant }>) => string }>;

const Badge = <Variant extends string>({
  className,
  variant,
  variants,
  ...props
}: BadgeProps<Variant>): ReactNode => (
  <span
    data-slot="badge"
    data-variant={variant}
    className={cn(variants({ variant }), className)}
    {...props}
  />
);

export { Badge };
export type { BadgeProps };
