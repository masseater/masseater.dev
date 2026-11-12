import type { Paragraph } from "@masseater.dev/yohaku-protocol";
import type { ReactNode } from "react";

import { useAutosave } from "#/pages/write/api/autosave.ts";
import { useDrafts } from "#/pages/write/api/drafts.ts";
import { AppHeader } from "#/shared/ui";

import { EditorSurface } from "./editor-surface.tsx";
import { MarginNotes } from "./margin-notes.tsx";
import { TitleField } from "./title-field.tsx";

const Writing = ({
  initial,
}: Readonly<{ initial: readonly (typeof Paragraph.Type)[] }>): ReactNode => {
  useAutosave();
  useDrafts();
  return (
    <div className="flex h-screen flex-col">
      <AppHeader>
        <TitleField />
      </AppHeader>
      <main className="grow overflow-y-auto py-14">
        <div className="mx-auto grid w-fit grid-cols-[52.5rem_18.75rem] gap-x-8">
          <EditorSurface initial={initial} />
          <MarginNotes />
        </div>
      </main>
    </div>
  );
};

export { Writing };
