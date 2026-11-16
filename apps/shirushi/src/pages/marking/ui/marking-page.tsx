import type { ReactNode } from "react";

import { CopyMcpCommand } from "#/features/connect-mcp";
import { LinkBar } from "#/features/load-song";

import { MarkingBody } from "./marking-body.tsx";

export const MarkingPage = (): ReactNode => (
  <main className="mx-auto grid max-w-6xl gap-5 px-4 py-5">
    <header className="flex gap-2 [&>form]:flex-1">
      <LinkBar />
      <CopyMcpCommand />
    </header>
    <MarkingBody />
  </main>
);
