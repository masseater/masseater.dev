import type { ReactNode } from "react";

export const StemNote = ({ text }: Readonly<{ text: string }>): ReactNode => (
  <p className="text-muted-foreground text-sm">{text}</p>
);
