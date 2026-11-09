import type { ReactNode } from "react";

import { useExpanded } from "#/pages/ranking/model/expanded";
import type { Ranked } from "#/pages/ranking/model/ranking";

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
