import type { ReactNode } from "react";

const Section = ({
  id,
  title,
  children,
}: Readonly<{ id: string; title: string; children: ReactNode }>): ReactNode => (
  <section className="flex flex-col gap-4">
    <h2 id={id} className="text-lg font-semibold">
      {title}
    </h2>
    {children}
  </section>
);

export { Section };
