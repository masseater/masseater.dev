import type { ReactNode } from "react";

import { useSettingsOpen } from "#/pages/interview/model/hooks";

import { SessionControls } from "./session-controls.tsx";
import { SettingsFields } from "./settings-fields.tsx";

const SessionBar = (): ReactNode => {
  const open = useSettingsOpen();
  return (
    <header className="flex flex-col gap-3 border-b px-4 py-3">
      <SessionControls />
      {open && <SettingsFields />}
    </header>
  );
};

export { SessionBar };
