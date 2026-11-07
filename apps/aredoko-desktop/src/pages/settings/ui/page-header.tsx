import type { ReactNode } from "react";

const PageHeader = ({ title }: Readonly<{ title: string }>): ReactNode => (
  <h2 className="text-xl font-semibold">{title}</h2>
);

export { PageHeader };
