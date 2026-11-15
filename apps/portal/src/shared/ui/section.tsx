import type { ReactNode } from "react";

export const Section = ({
  children,
  title,
}: Readonly<{ children: ReactNode; title: string }>): ReactNode => (
  <section className="flex flex-col gap-4">
    <h2 className="font-display text-foreground/50 text-xs tracking-widest uppercase">{title}</h2>
    {children}
  </section>
);
