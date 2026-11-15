import type { ReactNode } from "react";

export const PageHeader = ({ title }: Readonly<{ title: string }>): ReactNode => (
  <h2 className="text-xl font-semibold">{title}</h2>
);
