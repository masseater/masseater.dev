import type { ReactNode } from "react";

import { RevealLogButton } from "#/features/reveal-server-log";

const UNREACHABLE = "接続できません";

export const Unreachable = (): ReactNode => (
  <div className="flex items-center gap-2 text-xs">
    <p className="text-destructive font-medium">{UNREACHABLE}</p>
    <RevealLogButton />
  </div>
);
