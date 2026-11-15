import { cn } from "@masseater.dev/ui/cn";
import type { ReactNode } from "react";

import { phrased } from "#/shared/lib/phrases";

import { AskFailed } from "./ask-failed.tsx";
import { useShownQuestion } from "./shown-question.ts";
import { useTabTitle } from "./tab-title.ts";

export const QuestionStage = (): ReactNode => {
  const { question, faded } = useShownQuestion();
  useTabTitle(question);
  return (
    <section className="flex flex-col gap-2">
      <p
        aria-live="polite"
        className={cn(
          "text-xl leading-snug font-semibold break-keep text-balance wrap-anywhere transition-opacity duration-1000 lg:text-3xl",
          faded && "opacity-60",
        )}
      >
        {phrased(question)}
      </p>
      <AskFailed />
    </section>
  );
};
