import type { ReactNode } from "react";

import { CheckpointActions } from "#/features/answer-question";
import { useAnswering } from "#/pages/interview/model/session-hooks";

import { CurrentAnswer } from "./current-answer.tsx";
import { NextTopics } from "./next-topics.tsx";
import { QuestionStage } from "./question-stage.tsx";

export const AskedStage = (): ReactNode => (
  <div className="flex shrink-0 flex-col gap-6 pt-6 lg:min-h-0 lg:flex-1 lg:justify-center lg:pt-0">
    <QuestionStage />
    <CheckpointActions answering={useAnswering()} />
    <CurrentAnswer />
    <NextTopics />
  </div>
);
