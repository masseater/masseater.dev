import { Button as BaseButton } from "@masseater.dev/ui/button";
import { cn } from "@masseater.dev/ui/cn";
import type { ComponentProps, ReactNode } from "react";

export const Button = ({ className, ...props }: ComponentProps<typeof BaseButton>): ReactNode => (
  <BaseButton className={cn("rounded-full font-bold", className)} {...props} />
);
