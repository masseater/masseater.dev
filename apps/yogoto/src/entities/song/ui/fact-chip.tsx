import type { ReactNode } from "react";

export const FactChip = ({ text }: Readonly<{ text: string }>): ReactNode => (
  <span className="rounded-md border px-2 py-1 text-sm tabular-nums">{text}</span>
);
