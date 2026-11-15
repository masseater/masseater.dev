import type { ReactNode } from "react";

export const Note = ({ text }: Readonly<{ text: string }>): ReactNode => (
  <p className="text-muted-foreground py-12 text-center text-sm">{text}</p>
);
