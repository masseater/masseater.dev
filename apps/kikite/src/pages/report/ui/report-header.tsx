import type { ReactNode } from "react";

import { useTheme } from "#/entities/interview/index.ts";
import { SaveButton, SaveStatus } from "#/features/save-session/index.ts";

import { CopyButton } from "./copy-button.tsx";
import { RestartButton } from "./restart-button.tsx";

export const ReportHeader = (): ReactNode => (
  <header className="flex items-center gap-3">
    <h1 className="flex-1 text-xl font-semibold">{useTheme()}</h1>
    <SaveStatus />
    <CopyButton />
    <SaveButton />
    <RestartButton />
  </header>
);
