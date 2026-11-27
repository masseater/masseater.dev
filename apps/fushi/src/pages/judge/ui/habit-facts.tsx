import { Option } from "effect";
import type { ReactNode } from "react";

import type { Candidate } from "#/features/find-candidates/index.ts";
import { LABELS } from "#/shared/config/index.ts";
import { Fact } from "#/shared/ui/index.ts";

import { ShareFacts } from "./share-facts.tsx";

export const HabitFacts = ({
  candidate,
  songs,
}: Readonly<{ candidate: Candidate; songs: number }>): ReactNode => (
  <div className="flex flex-wrap gap-2">
    <Fact>{`${candidate.songs}${LABELS.separator}${songs} ${LABELS.songs}`}</Fact>
    <Fact>{`${candidate.count} ${LABELS.times}`}</Fact>
    {Option.isSome(candidate.shares) && <ShareFacts shares={candidate.shares.value} />}
  </div>
);
