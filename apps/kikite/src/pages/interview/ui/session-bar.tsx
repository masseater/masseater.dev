import type { ReactNode } from "react";

import { EndButton } from "./end-button.tsx";
import { HeaderRing } from "./header-ring.tsx";
import { SessionTheme } from "./session-theme.tsx";
import { SpeakerToggle } from "./speaker-toggle.tsx";

const SessionBar = (): ReactNode => (
  <header className="flex h-14 items-center gap-3 px-4">
    <HeaderRing />
    <SessionTheme />
    <SpeakerToggle />
    <EndButton />
  </header>
);

export { SessionBar };
