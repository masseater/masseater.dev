import type { ReactNode } from "react";

import { songsOf } from "#/entities/library/index.ts";
import type { Library, Style } from "#/entities/library/index.ts";
import { Evidence } from "#/features/find-candidates/index.ts";
import type { Candidate } from "#/features/find-candidates/index.ts";
import { nextOf } from "#/pages/judge/model/pending.ts";
import type { Judging } from "#/pages/judge/model/use-split.ts";
import { LABELS } from "#/shared/config/index.ts";
import { Subtitle, Title } from "#/shared/ui/index.ts";

import { HabitFacts } from "./habit-facts.tsx";
import { HabitVerdict } from "./habit-verdict.tsx";

export const HabitView = ({
  library,
  current: style,
  judging,
  candidate,
}: Readonly<{
  library: Library;
  current: Style;
  judging: Judging;
  candidate: Candidate;
}>): ReactNode => {
  const songs = songsOf(library)(style.id);
  return (
    <div className="grid gap-3">
      <p className="text-muted-foreground text-xs">{`${LABELS.harmonyAgainst} ${judging.found.baseline}`}</p>
      <Title>{candidate.key}</Title>
      <HabitFacts candidate={candidate} songs={songs.length} />
      <Subtitle>{LABELS.where}</Subtitle>
      <Evidence candidate={candidate} songs={songs} />
      <Subtitle>{LABELS.judge}</Subtitle>
      <HabitVerdict
        library={library}
        current={style}
        habit={candidate.key}
        next={nextOf(judging.split)(candidate.key)}
      />
    </div>
  );
};
