import type { ReactNode } from "react";

export const EmptyNote = ({ text }: Readonly<{ text: string }>): ReactNode => (
  <p className="text-muted-foreground text-sm">{text}</p>
);
