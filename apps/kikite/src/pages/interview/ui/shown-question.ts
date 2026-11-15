import { Option } from "effect";

import { parseDraft, useAsking, useStage, useStale } from "#/entities/interview";
import type { Asking } from "#/entities/interview";

type Shown = Readonly<{ question: string; faded: boolean }>;

const shownQuestion = (current: string, drafted: string): string => {
  if (drafted === "") {
    return current;
  }
  return drafted;
};

const draftText = (asking: Asking): string => {
  if (asking.status === "drafting") {
    return asking.text;
  }
  return "";
};

const useShownQuestion = (): Shown => {
  const asking = useAsking();
  const stale = useStale();
  const current = Option.match(useStage().question, {
    onNone: () => "",
    onSome: (entry) => entry.question,
  });
  const drafted = parseDraft(draftText(asking)).question;
  return {
    question: shownQuestion(current, drafted),
    faded: stale || (asking.status === "drafting" && drafted === ""),
  };
};

export { useShownQuestion };
