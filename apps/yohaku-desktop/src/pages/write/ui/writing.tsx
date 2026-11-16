import type { ReactNode } from "react";

import { useDrafts } from "#/features/edit-draft/index.ts";
import { TitleField } from "#/features/rename-manuscript/index.ts";
import { useAutosave } from "#/pages/write/api/autosave.ts";
import { useIdeaHint } from "#/pages/write/api/idea-hint.ts";
import { AppHeader } from "#/shared/ui/index.ts";

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
