import { cn } from "@masseater.dev/ui/cn";
import type { ReactNode } from "react";

import { phrased } from "#/pages/interview/lib/phrases";

import { AskFailed } from "./ask-failed.tsx";
import { useInView } from "./in-view.ts";
import { useShownQuestion } from "./shown-question.ts";
import { useTabTitle } from "./tab-title.ts";

const QuestionStage = (): ReactNode => {
  const { question, faded } = useShownQuestion();
  useTabTitle(question);
  const ref = useInView(question);
  return (
    <section ref={ref} className="flex scroll-mb-28 flex-col gap-2">
      <p
        aria-live="polite"
        className={cn(
          "text-2xl leading-snug font-semibold break-keep text-balance wrap-anywhere transition-opacity duration-1000",
          faded && "opacity-60",
        )}
      >
        {phrased(question)}
      </p>
      <AskFailed />
    </section>
  );
};

export { QuestionStage };
