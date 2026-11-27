import type { ReactNode } from "react";

import { OpenBody } from "./open-body.tsx";

export const FoldView = ({
  children,
  label,
}: Readonly<{ children: ReactNode; label: string }>): ReactNode => (
  <details>
    <summary className="text-muted-foreground cursor-pointer text-sm">{label}</summary>
    <OpenBody>{children}</OpenBody>
  </details>
);
