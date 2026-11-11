import type { ReactNode } from "react";

import { useTheme } from "#/pages/interview/model/hooks";

import { RestartButton } from "./restart-button.tsx";
import { SaveButton } from "./save-button.tsx";

const ReportHeader = (): ReactNode => (
  <header className="flex items-center gap-3">
    <h1 className="flex-1 text-xl font-semibold">{useTheme()}</h1>
    <SaveButton />
    <RestartButton />
  </header>
);

export { ReportHeader };
