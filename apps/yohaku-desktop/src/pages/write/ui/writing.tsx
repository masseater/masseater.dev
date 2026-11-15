import type { ReactNode } from "react";

import { useDrafts } from "#/features/edit-draft";
import { TitleField } from "#/features/rename-manuscript";
import { useAutosave } from "#/pages/write/api/autosave.ts";
import { useIdeaHint } from "#/pages/write/api/idea-hint.ts";
import { AppHeader } from "#/shared/ui";

import { WritingColumns } from "./writing-columns.tsx";

export const Writing = (): ReactNode => {
  useAutosave();
  useDrafts();
  useIdeaHint();
  return (
    <div className="flex h-screen flex-col">
      <AppHeader>
        <TitleField />
      </AppHeader>
      <main className="grow overflow-y-auto py-14">
        <WritingColumns />
      </main>
    </div>
  );
};
