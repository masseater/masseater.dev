import type { ReactNode } from "react";

const Note = ({ children, text }: Readonly<{ children: ReactNode; text: string }>): ReactNode => (
  <p className="text-muted-foreground flex items-start gap-2 text-xs [&_svg]:mt-0.5 [&_svg]:size-3.5 [&_svg]:shrink-0">
    {children}
    {text}
  </p>
);

export { Note };
