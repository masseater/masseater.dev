import type { ReactNode } from "react";

import { useTheme } from "#/entities/interview";

export const SessionTheme = (): ReactNode => (
  <p className="min-w-0 flex-1 truncate font-medium">{useTheme()}</p>
);
