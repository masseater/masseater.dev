import type { ReactNode } from "react";

import { parseDraft } from "#/pages/interview/lib/draft";
import type { Draft } from "#/pages/interview/model/hooks";
import { STRATEGIES } from "#strategies";

import { QuestionCard } from "./question-card.tsx";

const WAITING = "…";

const DraftQuestion = ({ draft }: Readonly<{ draft: Draft }>): ReactNode => {
  const { reason, question } = parseDraft(draft.text);
  return (
    <QuestionCard
      label={STRATEGIES[draft.strategy].label}
      reason={reason}
      question={question || WAITING}
    />
  );
};

export { DraftQuestion };
