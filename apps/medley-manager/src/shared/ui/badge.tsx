import { Badge as BaseBadge } from "@masseater.dev/ui/badge";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-bold whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        pink: "bg-comment-pink text-primary-foreground",
        cyan: "bg-comment-cyan text-primary-foreground",
        green: "bg-comment-green text-primary-foreground",
        orange: "bg-comment-orange text-primary-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Badge = ({
  variant,
  ...props
}: ComponentProps<"span"> & Readonly<VariantProps<typeof badgeVariants>>): ReactNode => (
  <BaseBadge variant={variant ?? "default"} variants={badgeVariants} {...props} />
);

export { Badge };
