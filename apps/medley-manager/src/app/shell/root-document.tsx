import { DocumentShell } from "@masseater.dev/start-shell/document-shell";
import type { ReactNode } from "react";

import { AppShell } from "./app-shell.tsx";

export const RootDocument = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <DocumentShell>
    <AppShell>{children}</AppShell>
  </DocumentShell>
);
