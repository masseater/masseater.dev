import type { ReactNode } from "react";

import { SongLink } from "#/entities/song/index.ts";
import { PillItem } from "#/shared/ui/pill-item.tsx";

export const SongPill = ({
  song,
}: Readonly<{ song: Readonly<{ id: number; title: string }> }>): ReactNode => (
  <PillItem>
    <SongLink id={song.id} title={`♪ ${song.title}`} />
  </PillItem>
);
