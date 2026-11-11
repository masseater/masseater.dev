import type { ReactNode } from "react";

import { useTheme } from "#/pages/interview/model/hooks";

const SessionTheme = (): ReactNode => (
  <p className="min-w-0 flex-1 truncate text-sm font-medium">{useTheme()}</p>
);

export { SessionTheme };
