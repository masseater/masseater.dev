import { CopyMcpCommand } from "@masseater.dev/media-notes-ui";
import type { ReactNode } from "react";

import { useLibraryChanges } from "#/pages/library/model/use-library-changes.ts";
import { LABELS } from "#/shared/config/index.ts";

import { Selected } from "./selected.tsx";
import { Sidebar } from "./sidebar.tsx";

export const LibraryPage = (): ReactNode => {
  useLibraryChanges();
  return (
    <main className="flex h-dvh flex-col">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <h1 className="text-sm font-semibold">{LABELS.songs}</h1>
        <CopyMcpCommand name="yogoto" />
      </header>
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <Selected />
      </div>
    </main>
  );
};
