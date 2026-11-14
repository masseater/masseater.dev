import type { ReactNode } from "react";

import { useAutosave } from "#/pages/write/api/autosave.ts";
import { useDrafts } from "#/pages/write/api/drafts.ts";
import { useIdeaHint } from "#/pages/write/api/idea-hint.ts";
import { AppHeader } from "#/shared/ui";

import { TitleField } from "./title-field.tsx";
import { WritingColumns } from "./writing-columns.tsx";

const Writing = (): ReactNode => {
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

export { Writing };
