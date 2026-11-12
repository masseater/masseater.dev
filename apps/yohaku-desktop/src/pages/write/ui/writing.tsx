import type { Paragraph } from "@masseater.dev/yohaku-protocol";
import type { ReactNode } from "react";

import { useAutosave } from "#/pages/write/api/autosave.ts";
import { useDrafts } from "#/pages/write/api/drafts.ts";
import { AppHeader } from "#/shared/ui";

import { TitleField } from "./title-field.tsx";
import { WritingColumns } from "./writing-columns.tsx";

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
        <WritingColumns initial={initial} />
      </main>
    </div>
  );
};

export { Writing };
