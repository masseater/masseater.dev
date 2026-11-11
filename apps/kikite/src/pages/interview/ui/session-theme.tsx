import type { ReactNode } from "react";

import { useTheme } from "#/pages/interview/model/hooks";

const SessionTheme = (): ReactNode => (
  <p className="text-muted-foreground min-w-0 flex-1 truncate text-sm">{useTheme()}</p>
);

export { SessionTheme };
