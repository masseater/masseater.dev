"use client";

import { HoverCard as HoverCardPrimitive } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";

const HoverCardContent = ({
  children,
}: Readonly<Pick<ComponentProps<typeof HoverCardPrimitive.Content>, "children">>): ReactNode => (
  <HoverCardPrimitive.Portal data-slot="hover-card-portal">
    <HoverCardPrimitive.Content
      className="hover-card-beside-trigger prose prose-sm prose-zinc bg-popover text-popover-foreground data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 z-50 w-72 rounded-xl border px-3 py-2 text-sm leading-relaxed shadow-md outline-hidden"
      data-slot="hover-card-content"
      align="start"
      side="top"
    >
      {children}
    </HoverCardPrimitive.Content>
  </HoverCardPrimitive.Portal>
);

export { HoverCardContent };
