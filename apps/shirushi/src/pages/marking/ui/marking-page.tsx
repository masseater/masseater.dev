import { CopyMcpCommand, OpenBar } from "@masseater.dev/media-notes-ui";
import type { ReactNode } from "react";

import { MarkingBody } from "./marking-body.tsx";

export const MarkingPage = (): ReactNode => (
  <main className="mx-auto grid max-w-6xl gap-5 px-4 py-5">
    <header className="flex items-start gap-2 [&>form]:flex-1">
      <OpenBar files={false} label="曲のリンク" />
      <CopyMcpCommand name="shirushi" />
    </header>
    <MarkingBody />
  </main>
);
