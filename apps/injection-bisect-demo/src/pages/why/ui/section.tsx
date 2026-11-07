import type { ReactNode } from "react";

const Section = ({
  title,
  children,
}: Readonly<{ title: string; children: ReactNode }>): ReactNode => (
  <section className="flex flex-col gap-4">
    <h2 className="text-xl font-bold">{title}</h2>
    {children}
  </section>
);

export { Section };
