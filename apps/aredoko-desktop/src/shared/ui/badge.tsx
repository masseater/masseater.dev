import { Badge as BaseBadge } from "@masseater.dev/ui/badge";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-white dark:bg-destructive/60",
        outline: "text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

const Badge = ({
  variant,
  ...props
}: ComponentProps<"span"> & Readonly<VariantProps<typeof badgeVariants>>): ReactNode => (
  <BaseBadge variant={variant ?? "default"} variants={badgeVariants} {...props} />
);

export { Badge };
