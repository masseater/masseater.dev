import { DocumentShell } from "@masseater.dev/start-shell/document-shell";
import type { ReactNode } from "react";

import { PortalShell } from "./portal-shell";

const RootDocument = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <DocumentShell>
    <PortalShell>{children}</PortalShell>
  </DocumentShell>
);

export { RootDocument };
