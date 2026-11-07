import type { ReactNode } from "react";

const Note = ({ text }: Readonly<{ text: string | null }>): ReactNode =>
  text !== null && (
    <p className="bg-muted text-muted-foreground w-full rounded-lg px-3 py-2 text-sm break-all">
      {text}
    </p>
  );

export { Note };
