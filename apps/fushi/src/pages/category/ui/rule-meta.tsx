import type { ReactNode } from "react";

import type { Song } from "#/entities/library/index.ts";
import { Evidence } from "#/features/find-candidates/index.ts";
import type { Candidate } from "#/features/find-candidates/index.ts";
import { LABELS } from "#/shared/config/index.ts";

export const RuleMeta = ({
  candidate,
  songs,
}: Readonly<{ candidate: Candidate; songs: readonly Song[] }>): ReactNode => (
  <>
    <p className="text-muted-foreground text-xs tabular-nums">
      {candidate.songs}
      {LABELS.space}
      {LABELS.songsWith}
      {LABELS.space}
      {candidate.count}
      {LABELS.space}
      {LABELS.times}
    </p>
    <Evidence candidate={candidate} songs={songs} />
  </>
);
