"use client";

import { cn } from "@masseater.dev/web-ui";
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import type { ReactNode } from "react";

import { toggleVariants } from "./toggle-variants";

const ToggleGroupItem = ({
  value,
  children,
}: Readonly<{ value: string; children: ReactNode }>): ReactNode => (
  <ToggleGroupPrimitive.Item
    data-slot="toggle-group-item"
    value={value}
    className={cn(
      toggleVariants({ variant: "outline", size: "default" }),
      "w-auto min-w-0 shrink-0 rounded-none border-l-0 px-3 shadow-none first:rounded-l-md first:border-l last:rounded-r-md focus:z-10 focus-visible:z-10",
    )}
  >
    {children}
  </ToggleGroupPrimitive.Item>
);

export { ToggleGroupItem };
