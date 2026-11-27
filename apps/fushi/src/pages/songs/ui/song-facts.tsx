import type { ReactNode } from "react";

import type { SongView } from "#/entities/song/index.ts";
import { LABELS } from "#/shared/config/index.ts";
import { Fact, Subtitle } from "#/shared/ui/index.ts";

import { Timeline } from "./timeline.tsx";

export const SongFacts = ({ view }: Readonly<{ view: SongView }>): ReactNode => (
  <>
    <div className="flex flex-wrap gap-2">
      <Fact>{`${view.bars} ${LABELS.bars}`}</Fact>
      <Fact>{`${Math.round(view.bpm)} ${LABELS.bpm}`}</Fact>
    </div>
    <Subtitle>{LABELS.timeline}</Subtitle>
    <Timeline view={view} />
  </>
);
