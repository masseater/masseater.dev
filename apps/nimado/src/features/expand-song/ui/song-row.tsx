import type { ReactNode } from "react";

import type { Ranked } from "#/entities/ranking";
import { useExpanded } from "#/features/expand-song/model/expanded";

import { SummaryRow } from "./summary-row";
import { VideoRow } from "./video-row";

const SongRow = ({
  entry,
  rank,
  youtube,
}: Readonly<{ entry: Ranked; rank: number; youtube: boolean }>): ReactNode => {
  const [open, toggle] = useExpanded(entry.id);
  return (
    <>
      <SummaryRow entry={entry} rank={rank} open={open} onToggle={toggle} youtube={youtube} />
      {open && <VideoRow id={entry.id} youtube={youtube} />}
    </>
  );
};

export { SongRow };
