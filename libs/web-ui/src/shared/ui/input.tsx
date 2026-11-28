import { cn } from "@masseater.dev/ui/cn";
import { INPUT_CLASS } from "@masseater.dev/ui/input-class";
import type { ComponentProps, ReactNode } from "react";

export const Input = ({ className, type, ...props }: ComponentProps<"input">): ReactNode => (
  <input type={type} data-slot="input" className={cn(INPUT_CLASS, className)} {...props} />
);
