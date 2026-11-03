import type { ReactNode } from "react";

const SelectedTab = ({ label }: Readonly<{ label: string }>): ReactNode => (
  <span className="border-wiki-text text-wiki-text border-b-2 px-2 py-1">{label}</span>
);

export { SelectedTab };
