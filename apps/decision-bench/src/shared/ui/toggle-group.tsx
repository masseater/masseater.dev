"use client";

import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui";
import type { ReactNode } from "react";

const ToggleGroup = ({
  label,
  value,
  onValueChange,
  children,
}: Readonly<{
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
}>): ReactNode => (
  <ToggleGroupPrimitive.Root
    type="single"
    data-slot="toggle-group"
    aria-label={label}
    value={value}
    onValueChange={onValueChange}
    className="group/toggle-group flex w-fit items-center rounded-md shadow-xs"
  >
    {children}
  </ToggleGroupPrimitive.Root>
);

export { ToggleGroup };
