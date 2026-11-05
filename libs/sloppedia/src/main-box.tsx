import type { ReactNode } from "react";

const MainBox = ({
  title,
  children,
}: Readonly<{ title: string; children: ReactNode }>): ReactNode => (
  <section className="border-wiki-divider min-w-0 border">
    <h2 className="bg-wiki-chrome border-wiki-divider border-b px-3 py-1 font-serif text-lg">
      {title}
    </h2>
    <div className="p-3">{children}</div>
  </section>
);

export { MainBox };
