import { cn } from "@masseater.dev/ui/cn";
import type { ReactNode } from "react";

import { AskFailed } from "./ask-failed.tsx";
import { useShownQuestion } from "./shown-question.ts";
import { useTabTitle } from "./tab-title.ts";

const QuestionStage = (): ReactNode => {
  const { question, faded } = useShownQuestion();
  useTabTitle(question);
  return (
    <section className="flex flex-col gap-2">
      <p
        aria-live="polite"
        className={cn(
          "text-2xl leading-snug font-semibold text-balance transition-opacity duration-1000",
          faded && "opacity-50",
        )}
      >
        {question}
      </p>
      <AskFailed />
    </section>
  );
};

export { QuestionStage };
