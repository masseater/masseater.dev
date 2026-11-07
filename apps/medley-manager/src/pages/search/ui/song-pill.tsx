import type { ReactNode } from "react";

import { SongLink } from "#/entities/catalog";
import { PillItem } from "#/shared/ui/pill-item";

const SongPill = ({
  song,
}: Readonly<{ song: Readonly<{ id: number; title: string }> }>): ReactNode => (
  <PillItem>
    <SongLink id={song.id} title={`♪ ${song.title}`} />
  </PillItem>
);

export { SongPill };
