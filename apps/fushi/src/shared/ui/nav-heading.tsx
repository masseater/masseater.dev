import type { ReactNode } from "react";

export const NavHeading = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <p className="text-muted-foreground mt-4 mb-1 px-2 text-xs font-semibold first:mt-0">
    {children}
  </p>
);
