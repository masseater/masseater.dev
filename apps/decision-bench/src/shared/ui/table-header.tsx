import { cn } from "@masseater.dev/web-ui";
import type { ComponentProps, ReactNode } from "react";

export const TableHeader = ({ className, ...props }: ComponentProps<"thead">): ReactNode => (
  <thead data-slot="table-header" className={cn("[&_tr]:border-b", className)} {...props} />
);
