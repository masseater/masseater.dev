import type { ReactNode } from "react";

import { useRunSession } from "#/pages/interview/model/session-hooks";

import { ConversationColumn } from "./conversation-column.tsx";
import { NotesColumn } from "./notes-column.tsx";
import { SessionBar } from "./session-bar.tsx";
import { TranscriptColumn } from "./transcript-column.tsx";
import { useTypeAnywhere } from "./type-anywhere.ts";

export const SessionView = (): ReactNode => {
  useRunSession();
  useTypeAnywhere();
  return (
    <div className="flex h-dvh flex-col">
      <SessionBar />
      <main className="flex min-h-0 flex-1 border-t">
        <NotesColumn />
        <ConversationColumn />
        <TranscriptColumn />
      </main>
    </div>
  );
};
