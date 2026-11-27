import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";

export const Failure = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <p className="text-destructive flex items-center gap-2 text-sm">
    <CircleAlert className="size-4" aria-hidden />
    {children}
  </p>
);
