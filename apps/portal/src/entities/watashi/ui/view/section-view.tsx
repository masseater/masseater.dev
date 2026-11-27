import type { ReactNode } from "react";

export const SectionView = ({
  children,
  title,
}: Readonly<{ children: ReactNode; title: string }>): ReactNode => (
  <section className="flex flex-col gap-1">
    <h4 className="text-muted-foreground text-xs font-bold">{title}</h4>
    {children}
  </section>
);
