import type { ReactNode } from "react";

import type { CssVariables } from "#/shared/lib/css-variables.ts";

export const Run = ({
  className,
  vars,
  children,
}: Readonly<{ className: string; vars: CssVariables; children?: ReactNode }>): ReactNode => (
  <span className={className} style={vars}>
    {children}
  </span>
);
