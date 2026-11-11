import type { ReactNode } from "react";

import { useAsked } from "#/pages/interview/model/hooks";

import { AnswerBox } from "./answer-box.tsx";
import { History } from "./history.tsx";
import { OpeningStage } from "./opening-stage.tsx";
import { QuestionStage } from "./question-stage.tsx";
import { Said } from "./said.tsx";

const ConversationColumn = (): ReactNode => {
  const asked = useAsked();
  return (
    <div className="mx-auto flex w-full max-w-2xl min-w-0 flex-1 flex-col gap-6">
      {asked && <History />}
      {asked && <QuestionStage />}
      {!asked && <OpeningStage />}
      <Said />
      <AnswerBox />
    </div>
  );
};

export { ConversationColumn };
