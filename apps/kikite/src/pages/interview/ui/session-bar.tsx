import type { ReactNode } from "react";

import { SaveStatus } from "#/features/save-session";

import { EndButton } from "./end-button.tsx";
import { HeaderRing } from "./header-ring.tsx";
import { SessionTheme } from "./session-theme.tsx";

export const SessionBar = (): ReactNode => (
  <header className="flex h-14 items-center gap-3 px-4">
    <HeaderRing />
    <SessionTheme />
    <SaveStatus />
    <EndButton />
  </header>
);
