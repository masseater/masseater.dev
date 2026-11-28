import type { VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";

import { buttonVariants } from "#/shared/lib/button-variants.ts";
import { cn } from "#/shared/lib/cn.ts";

export const Button = ({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: ComponentProps<"button"> &
  Readonly<VariantProps<typeof buttonVariants>> &
  Readonly<{ asChild?: boolean }>): ReactNode => {
  const classes = cn(buttonVariants({ variant, size, className }));
  if (asChild) {
    return (
      <Slot.Root
        data-slot="button"
        data-variant={variant}
        data-size={size}
        className={classes}
        {...props}
      />
    );
  }
  return (
    <button
      type="button"
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={classes}
      {...props}
    />
  );
};
