import type { ReactNode } from "react";

export const ProfileColumn = ({
  children,
  title,
}: Readonly<{ children: ReactNode; title: string }>): ReactNode => (
  <div aria-label={title} className="flex min-w-0 flex-col gap-3">
    <p className="text-muted-foreground text-sm font-bold">{title}</p>
    {children}
  </div>
);
