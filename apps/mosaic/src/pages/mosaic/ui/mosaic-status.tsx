import type { ReactNode } from "react";

export const MosaicStatus = ({ message }: Readonly<{ message: string }>): ReactNode => (
  <p className="text-muted-foreground absolute inset-0 grid animate-pulse place-items-center text-sm">
    {message}
  </p>
);
