import type { ReactNode } from "react";

import { useRunSession } from "#/pages/interview/model/hooks";

import { ConversationColumn } from "./conversation-column.tsx";
import { SessionBar } from "./session-bar.tsx";
import { SummaryPanel } from "./summary-panel.tsx";
import { useTypeAnywhere } from "./type-anywhere.ts";

const SessionView = (): ReactNode => {
  useRunSession();
  useTypeAnywhere();
  return (
    <div className="flex min-h-dvh flex-col">
      <SessionBar />
      <main className="flex flex-1 gap-10 px-4 pb-8 lg:px-10">
        <div className="hidden w-72 shrink-0 lg:block" />
        <ConversationColumn />
        <SummaryPanel />
      </main>
    </div>
  );
};

export { SessionView };
