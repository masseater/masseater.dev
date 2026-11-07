import { Button as BaseButton } from "@masseater.dev/ui/button";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "#/shared/lib/utils";

const Button = ({ className, ...props }: ComponentProps<typeof BaseButton>): ReactNode => (
  <BaseButton className={cn("rounded-full font-bold", className)} {...props} />
);

export { Button };
