import type { ReactNode } from "react";

import { EndButton } from "./end-button.tsx";
import { HeaderRing } from "./header-ring.tsx";
import { SaveStatus } from "./save-status.tsx";
import { SessionTheme } from "./session-theme.tsx";

const SessionBar = (): ReactNode => (
  <header className="flex h-14 items-center gap-3 px-4">
    <HeaderRing />
    <SessionTheme />
    <SaveStatus />
    <EndButton />
  </header>
);

export { SessionBar };
