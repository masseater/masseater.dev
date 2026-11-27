import type { ReactNode } from "react";

export const TextView = ({ text }: Readonly<{ text: string }>): ReactNode => (
  <p className="leading-relaxed">{text}</p>
);
