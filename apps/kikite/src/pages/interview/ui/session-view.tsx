import type { ReactNode } from "react";

import { useRunSession } from "#/pages/interview/model/hooks";

import { ConversationColumn } from "./conversation-column.tsx";
import { SessionBar } from "./session-bar.tsx";
import { SummaryPanel } from "./summary-panel.tsx";

const SessionView = (): ReactNode => {
  useRunSession();
  return (
    <div className="flex min-h-dvh flex-col">
      <SessionBar />
      <main className="flex flex-1 flex-col gap-6 px-4 py-6 lg:flex-row">
        <ConversationColumn />
        <SummaryPanel />
      </main>
    </div>
  );
};

export { SessionView };
