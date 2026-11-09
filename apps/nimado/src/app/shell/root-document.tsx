import { RegistryProvider } from "@effect/atom-react";
import { DocumentShell } from "@masseater.dev/start-shell/document-shell";
import type { ReactNode } from "react";

const RootDocument = ({ children }: Readonly<{ children: ReactNode }>): ReactNode => (
  <DocumentShell>
    <RegistryProvider>{children}</RegistryProvider>
  </DocumentShell>
);

export { RootDocument };
