import { CopyMcpCommand, OpenBar } from "@masseater.dev/media-notes-ui";
import type { ReactNode } from "react";

import { useTasteChanges } from "#/entities/taste/index.ts";

import { MarkingBody } from "./marking-body.tsx";

export const MarkingPage = (): ReactNode => {
  useTasteChanges();
  return (
    <main className="mx-auto grid max-w-6xl gap-5 px-4 py-5">
      <header className="flex items-start gap-2 [&>form]:flex-1">
        <OpenBar files label="リンク" />
        <CopyMcpCommand name="shirushi" />
      </header>
      <MarkingBody />
    </main>
  );
};
