import { Option } from "effect";
import type { ReactNode } from "react";

import { useLastQuestion } from "#/pages/interview/model/hooks";
import { STRATEGIES } from "#strategies";

import { QuestionCard } from "./question-card.tsx";
import { RatingButtons } from "./rating-buttons.tsx";

const LastQuestion = (): ReactNode =>
  Option.match(useLastQuestion(), {
    onNone: () => false,
    onSome: (entry) => (
      <div className="flex flex-col gap-3">
        <QuestionCard
          label={STRATEGIES[entry.strategy].label}
          reason={entry.reason}
          question={entry.question}
        />
        <RatingButtons id={entry.id} rating={entry.rating} />
      </div>
    ),
  });

export { LastQuestion };
