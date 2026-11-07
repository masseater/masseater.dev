import type { ReactNode } from "react";

import { ServerStatus } from "./server-status.tsx";
import { SettingsButton } from "./settings-button.tsx";

const TITLE = "aredoko";

const Header = (): ReactNode => (
  <header className="bg-card flex items-center gap-6 border-b px-6 py-3">
    <h1 className="text-lg font-semibold">{TITLE}</h1>
    <div className="ml-auto flex items-center gap-4">
      <ServerStatus />
      <SettingsButton />
    </div>
  </header>
);

export { Header };
