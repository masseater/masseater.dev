import { Tooltip } from "radix-ui";
import type { ReactNode } from "react";

import { SidebarTip } from "./sidebar-tip";

export const SidebarTooltip = ({
  children,
  label,
}: Readonly<{ children: ReactNode; label: string }>): ReactNode => (
  <Tooltip.Root>
    <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
    <SidebarTip label={label} />
  </Tooltip.Root>
);
