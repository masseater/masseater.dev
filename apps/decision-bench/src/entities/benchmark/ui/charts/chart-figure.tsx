import type { ReactNode } from "react";

const ChartFigure = ({
  title,
  children,
}: Readonly<{ title: string; children: ReactNode }>): ReactNode => (
  <figure className="flex flex-col gap-2">
    <figcaption className="text-sm font-medium">{title}</figcaption>
    {children}
  </figure>
);

export { ChartFigure };
