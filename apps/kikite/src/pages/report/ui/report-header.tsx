import { PageHeader } from "@masseater.dev/ui/page-header";
import type { ReactNode } from "react";

import { useTheme } from "#/entities/interview/index.ts";
import { SaveButton, SaveStatus } from "#/features/save-session/index.ts";

import { CopyButton } from "./copy-button.tsx";
import { RestartButton } from "./restart-button.tsx";

export const ReportHeader = (): ReactNode => (
  <PageHeader layout="bar" title={useTheme()}>
    <SaveStatus />
    <CopyButton />
    <SaveButton />
    <RestartButton />
  </PageHeader>
);
