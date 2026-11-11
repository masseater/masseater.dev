import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import { useAsking } from "#/pages/interview/model/hooks";
import type { Draft } from "#/pages/interview/model/hooks";

import { CandidateGrid } from "./candidate-grid.tsx";
import { DraftQuestion } from "./draft-question.tsx";
import { LastQuestion } from "./last-question.tsx";

const SINGLE = 1;

const onlyDraft = (drafts: readonly Draft[]): Option.Option<Draft> =>
  pipe(
    Arr.head(drafts),
    Option.filter(() => drafts.length === SINGLE),
  );

const QuestionStage = (): ReactNode => {
  const asking = useAsking();
  if (asking.status === "idle") {
    return <LastQuestion />;
  }
  const { drafts } = asking;
  const only = onlyDraft(drafts);
  if (Option.isSome(only)) {
    return <DraftQuestion draft={only.value} />;
  }
  return <CandidateGrid drafts={drafts} choosing={asking.status === "choosing"} />;
};

export { QuestionStage };
