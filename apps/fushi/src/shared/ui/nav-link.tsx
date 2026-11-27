import { cn } from "@masseater.dev/ui/cn";
import type { ReactNode } from "react";

export const NavLink = ({
  href,
  active,
  children,
}: Readonly<{ href: string; active: boolean; children: ReactNode }>): ReactNode => (
  <a
    href={href}
    aria-current={active && "page"}
    className={cn(
      "text-muted-foreground hover:text-foreground block truncate border-l-2 border-transparent px-2 py-1 text-sm",
      active && "border-foreground text-foreground font-semibold",
    )}
  >
    {children}
  </a>
);
