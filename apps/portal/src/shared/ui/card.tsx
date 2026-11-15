import type { ReactNode } from "react";

export const Card = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <section className="bg-card text-card-foreground flex min-w-0 flex-col gap-4 rounded-xl border p-5 sm:p-6">
    {children}
  </section>
);
