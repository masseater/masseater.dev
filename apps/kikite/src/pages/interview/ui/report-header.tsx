import type { ReactNode } from "react";

import { useTheme } from "#/pages/interview/model/hooks";

import { CopyButton } from "./copy-button.tsx";
import { RestartButton } from "./restart-button.tsx";
import { SaveButton } from "./save-button.tsx";
import { SaveStatus } from "./save-status.tsx";

const ReportHeader = (): ReactNode => (
  <header className="flex items-center gap-3">
    <h1 className="flex-1 text-xl font-semibold">{useTheme()}</h1>
    <SaveStatus />
    <CopyButton />
    <SaveButton />
    <RestartButton />
  </header>
);

export { ReportHeader };
