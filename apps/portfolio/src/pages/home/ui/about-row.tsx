import type { ReactNode } from "react";

const AboutRow = ({
  term,
  children,
}: Readonly<{ term: string; children: ReactNode }>): ReactNode => (
  <div className="border-foreground/10 grid gap-2 border-t pt-4 sm:grid-cols-4">
    <dt className="font-display text-foreground/70 text-xs tracking-widest">{term}</dt>
    <dd className="sm:col-span-3">{children}</dd>
  </div>
);

export { AboutRow };
