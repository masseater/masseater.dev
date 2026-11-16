import { DocumentShell } from "@masseater.dev/start-shell/document-shell";
import { getRouteApi } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { PortalShell } from "./portal-shell.tsx";

const root = getRouteApi("__root__");

export const RootDocument = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <DocumentShell>
    <PortalShell sidebarOpen={root.useLoaderData().open}>{children}</PortalShell>
  </DocumentShell>
);
