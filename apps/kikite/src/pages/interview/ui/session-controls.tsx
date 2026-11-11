import type { ReactNode } from "react";

import { EndButton } from "./end-button.tsx";
import { ListeningIcon } from "./listening-icon.tsx";
import { NextQuestionButton } from "./next-question-button.tsx";
import { SaveButton } from "./save-button.tsx";
import { SessionTheme } from "./session-theme.tsx";
import { SettingsToggle } from "./settings-toggle.tsx";

const SessionControls = (): ReactNode => (
  <div className="flex items-center gap-3">
    <ListeningIcon />
    <SessionTheme />
    <NextQuestionButton />
    <SettingsToggle />
    <SaveButton />
    <EndButton />
  </div>
);

export { SessionControls };
