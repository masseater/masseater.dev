import type { ReactNode } from "react";

import { AnswerBox } from "./answer-box.tsx";
import { ConversationStage } from "./conversation-stage.tsx";
import { PanelTabs } from "./panel-tabs.tsx";

const ConversationColumn = (): ReactNode => (
  <div className="flex min-w-0 flex-1 flex-col gap-4 px-4 pb-4 lg:px-10">
    <ConversationStage />
    <PanelTabs />
    <AnswerBox />
  </div>
);

export { ConversationColumn };
