import type { ReactNode } from "react";

import { RevealLogButton } from "#/features/reveal-server-log/index.ts";

export const LogSetting = (): ReactNode => (
  <div className="flex">
    <RevealLogButton />
  </div>
);
