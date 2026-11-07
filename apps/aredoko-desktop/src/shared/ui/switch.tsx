import { cn } from "@masseater.dev/ui/cn";
import { Switch as SwitchPrimitive } from "radix-ui";
import type { ReactNode } from "react";

const Switch = ({
  className,
  id,
  checked,
  disabled,
  onCheckedChange,
}: Readonly<{
  className?: string;
  id: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}>): ReactNode => (
  <SwitchPrimitive.Root
    data-slot="switch"
    id={id}
    checked={checked}
    disabled={disabled ?? false}
    onCheckedChange={onCheckedChange}
    className={cn(
      "peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent p-0.5 shadow-xs transition-all outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80",
      className,
    )}
  >
    <SwitchPrimitive.Thumb
      data-slot="switch-thumb"
      className="bg-background dark:data-[state=checked]:bg-primary-foreground dark:data-[state=unchecked]:bg-foreground pointer-events-none block size-4 rounded-full ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
    />
  </SwitchPrimitive.Root>
);

export { Switch };
