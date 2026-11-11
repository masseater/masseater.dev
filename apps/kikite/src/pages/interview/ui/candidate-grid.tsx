import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { Draft } from "#/pages/interview/model/hooks";

import { CandidateCard } from "./candidate-card.tsx";

const CandidateGrid = ({
  drafts,
  choosing,
}: Readonly<{ drafts: readonly Draft[]; choosing: boolean }>): ReactNode => (
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {pipe(
      drafts,
      Arr.map((draft) => <CandidateCard key={draft.strategy} draft={draft} choosing={choosing} />),
    )}
  </div>
);

export { CandidateGrid };
