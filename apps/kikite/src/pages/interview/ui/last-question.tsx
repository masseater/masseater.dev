import { Option } from "effect";
import type { ReactNode } from "react";

import { useLastQuestion } from "#/pages/interview/model/hooks";
import { STRATEGIES } from "#strategies";

import { QuestionCard } from "./question-card.tsx";

const LastQuestion = (): ReactNode =>
  Option.match(useLastQuestion(), {
    onNone: () => false,
    onSome: (entry) => (
      <QuestionCard
        label={STRATEGIES[entry.strategy].label}
        reason={entry.reason}
        question={entry.question}
      />
    ),
  });

export { LastQuestion };
