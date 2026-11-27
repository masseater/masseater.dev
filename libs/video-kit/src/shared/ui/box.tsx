import type { ReactNode } from "react";

import type { CssVariables } from "#/shared/lib/css-variables.ts";

export const Box = ({
  className,
  vars,
  children,
}: Readonly<{ className: string; vars: CssVariables; children?: ReactNode }>): ReactNode => (
  <div className={className} style={vars}>
    {children}
  </div>
);
