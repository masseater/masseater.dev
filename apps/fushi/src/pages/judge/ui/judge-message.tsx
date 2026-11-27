import type { ReactNode } from "react";

import { LABELS } from "#/shared/config/index.ts";
import { Title } from "#/shared/ui/index.ts";

export const JudgeMessage = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <div className="grid gap-3">
    <Title>{LABELS.judge}</Title>
    {children}
  </div>
);
