import type { ReactNode } from "react";

import { CheckpointActions } from "./checkpoint-actions.tsx";
import { NextTopics } from "./next-topics.tsx";
import { QuestionStage } from "./question-stage.tsx";

const AskedStage = (): ReactNode => (
  <div className="flex shrink-0 flex-col gap-6 pt-6 lg:flex-1 lg:justify-center lg:pt-0">
    <QuestionStage />
    <CheckpointActions />
    <NextTopics />
  </div>
);

export { AskedStage };
