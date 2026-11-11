import type { ReactNode } from "react";

import { AnswerBox } from "./answer-box.tsx";
import { QuestionStage } from "./question-stage.tsx";
import { Timeline } from "./timeline.tsx";

const ConversationColumn = (): ReactNode => (
  <div className="flex min-w-0 flex-1 flex-col gap-6">
    <QuestionStage />
    <AnswerBox />
    <Timeline />
  </div>
);

export { ConversationColumn };
