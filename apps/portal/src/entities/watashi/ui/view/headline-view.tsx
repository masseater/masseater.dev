import type { ReactNode } from "react";

export const HeadlineView = ({ text }: Readonly<{ text: string }>): ReactNode => (
  <h3 className="text-lg leading-snug font-bold">{text}</h3>
);
