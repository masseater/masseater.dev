import type { ReactNode } from "react";

import type { Candidate } from "#/features/find-candidates/index.ts";
import { LABELS } from "#/shared/config/index.ts";
import { Fact } from "#/shared/ui/index.ts";

const PERCENT = 100;

const percent = (share: number): string => `${Math.round(share * PERCENT)}%`;

export const HabitFacts = ({
  candidate,
  songs,
}: Readonly<{ candidate: Candidate; songs: number }>): ReactNode => (
  <div className="flex flex-wrap gap-2">
    <Fact>{`${candidate.songs}${LABELS.separator}${songs} ${LABELS.songs}`}</Fact>
    <Fact>{`${candidate.count} ${LABELS.times}`}</Fact>
    <Fact>{`${LABELS.inSongs} ${percent(candidate.share)}`}</Fact>
    <Fact>{`${LABELS.inBaseline} ${percent(candidate.baselineShare)}`}</Fact>
  </div>
);
