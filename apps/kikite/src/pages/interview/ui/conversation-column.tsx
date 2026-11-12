import type { ReactNode } from "react";

import { AnswerBox } from "./answer-box.tsx";
import { ConversationStage } from "./conversation-stage.tsx";

const ConversationColumn = (): ReactNode => (
  <div className="mx-auto flex w-full max-w-2xl min-w-0 flex-1 flex-col gap-6">
    <ConversationStage />
    <AnswerBox />
  </div>
);

export { ConversationColumn };
