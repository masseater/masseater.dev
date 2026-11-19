import type { ReactNode } from "react";

export const MosaicStatus = ({ message }: Readonly<{ message: string }>): ReactNode => (
  <p
    role="alert"
    className="text-muted-foreground absolute inset-0 grid place-items-center text-sm motion-safe:animate-pulse"
  >
    {message}
  </p>
);
